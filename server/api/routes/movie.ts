import { db } from "@/server/drizzle";
import { HTTPException } from "hono/http-exception";
import { tmdbApiRequestQueue } from "@/server/redis";
import { movie, library, library_movies } from "@/server/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { Variables } from "../type";
import z from "zod";
import { zValidator } from "@hono/zod-validator";
import { nanoid } from "nanoid";
import fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { spawn } from "node:child_process";

const queueSchema = z.object({
  movies: z.array(
    z.object({
      libraryPath: z.string(),
      filePath: z.string(),
      movieTitle: z.string(),
      year: z.string().optional(),
    })
  ),
});

const moviePathSchema = z.object({
  tmdbId: z.string(),
});

const playSchema = z.object({
  moviePath: z.string(),
});

/**
 * 将一个视频文件重封装为 MP4，并返回一个在转换完成后解析的 Promise。
 * @param inputPath 输入文件的路径
 * @param outputPath 输出文件的路径
 */
function remuxToMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Starting remux from ${inputPath} to ${outputPath}`);

    const ffmpegArgs = ["-i", inputPath, "-c", "copy", "-sn", outputPath];
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    let errorOutput = "";
    ffmpegProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        console.log(`Successfully remuxed to ${outputPath}`);
        resolve(); // 转换成功，Promise 完成
      } else {
        console.error(
          `Failed to remux ${inputPath}. FFmpeg exited with code ${code}.`
        );
        console.error("FFmpeg error output:", errorOutput);
        reject(new Error(`FFmpeg failed with code ${code}`)); // 转换失败，Promise 拒绝
      }
    });

    ffmpegProcess.on("error", (err) => {
      console.error("Failed to start FFmpeg process.", err);
      reject(err);
    });
  });
}

export const movieRoute = new Hono<{ Variables: Variables }>()
  .use(async (c, next) => {
    const userId = c.get("user")?.id;
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    await next();
  })
  .get("/lists", async (c) => {
    const userId = c.get("user")?.id;
    const userMovies = await db
      .select({
        movie: movie,
        path: library_movies.path,
      })
      .from(library)
      .where(eq(library.userId, userId!))
      .innerJoin(library_movies, eq(library.id, library_movies.libraryId))
      .innerJoin(movie, eq(library_movies.movieId, movie.id))
      .orderBy(desc(movie.createdAt));

    return c.json(userMovies);
  })
  .post(
    "/queue",
    zValidator("json", queueSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { movies: incomingMovies } = c.req.valid("json");

      if (incomingMovies.length === 0) {
        return c.json({ success: true, message: "No movies to process." });
      }

      const libraryPath = incomingMovies[0].libraryPath;

      let lib = await db.query.library.findFirst({
        where: and(eq(library.userId, userId!), eq(library.path, libraryPath)),
      });

      if (!lib) {
        const newLibraries = await db
          .insert(library)
          .values({ id: nanoid(), userId: userId!, path: libraryPath })
          .returning();
        lib = newLibraries[0];
      }

      const existingLinks = await db
        .select({ path: library_movies.path })
        .from(library_movies)
        .where(eq(library_movies.libraryId, lib.id));

      const existingFilePaths = new Set(existingLinks.map((l) => l.path));

      const newMoviesToQueue = incomingMovies.filter(
        (m) => !existingFilePaths.has(m.filePath)
      );

      if (newMoviesToQueue.length === 0) {
        return c.json({
          success: true,
          message: "All movies already exist in the library.",
        });
      }

      tmdbApiRequestQueue.addBulk(
        newMoviesToQueue.map((movie) => ({
          name: "tmdb-api-request",
          data: { ...movie, userId },
        }))
      );

      return c.json(
        {
          success: true,
          message: `Queued ${newMoviesToQueue.length} new movies.`,
        },
        { status: 200 }
      );
    }
  )
  .get("/queueStatus", async (c) => {
    const userId = c.get("user")?.id;
    const queueJobs = await tmdbApiRequestQueue.getJobs([
      "active",
      "waiting",
      "failed",
      "completed",
    ]);

    const userQueueJobs = queueJobs.filter(
      (job) => job.data.userId === userId!
    );

    // 处理队列数据
    const queueStats = {
      active: userQueueJobs.filter(
        (job) => !job.finishedOn && !job.failedReason
      ).length,
      waiting: userQueueJobs.filter(
        (job) => !job.finishedOn && !job.failedReason && !job.processedOn
      ).length,
      failed: userQueueJobs.filter((job) => job.failedReason).length,
      completed: userQueueJobs.filter(
        (job) => job.finishedOn && !job.failedReason
      ).length,
    };

    const queueDetails = {
      active: userQueueJobs
        .filter((job) => !job.finishedOn && !job.failedReason)
        .map((job) => ({
          id: job.id,
          movieTitle: job.data.movieTitle,
          year: job.data.year,
          progress: job.progress,
          timestamp: job.timestamp,
          libraryPath: job.data.libraryPath,
        })),
      waiting: userQueueJobs
        .filter(
          (job) => !job.finishedOn && !job.failedReason && !job.processedOn
        )
        .map((job) => ({
          id: job.id,
          movieTitle: job.data.movieTitle,
          year: job.data.year,
          timestamp: job.timestamp,
          libraryPath: job.data.libraryPath,
        })),
      failed: userQueueJobs
        .filter((job) => job.failedReason)
        .map((job) => ({
          id: job.id,
          movieTitle: job.data.movieTitle,
          year: job.data.year,
          failedReason: job.failedReason,
          timestamp: job.timestamp,
          libraryPath: job.data.libraryPath,
        })),
      completed: userQueueJobs
        .filter((job) => job.finishedOn && !job.failedReason)
        .map((job) => ({
          id: job.id,
          movieTitle: job.data.movieTitle,
          year: job.data.year,
          timestamp: job.timestamp,
          libraryPath: job.data.libraryPath,
        })),
    };

    return c.json({
      stats: queueStats,
      details: queueDetails,
    });
  })
  .get(
    "/moviePath",
    zValidator("query", moviePathSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { tmdbId } = c.req.query();
      const result = await db
        .select({
          path: library_movies.path,
        })
        .from(library_movies)
        .innerJoin(library, eq(library_movies.libraryId, library.id))
        .innerJoin(movie, eq(library_movies.movieId, movie.id))
        .where(
          and(eq(library.userId, userId!), eq(movie.tmdbId, parseInt(tmdbId)))
        );

      if (result.length === 0) {
        throw new HTTPException(404, { message: "Movie not found" });
      }
      return c.json({ path: result[0].path });
    }
  )
  .use(async (c, next) => {
    const userId = c.get("user")?.id;
    const moviePath = c.req.query("moviePath");
    const userMovieAccess = await db
      .select({
        path: library_movies.path,
      })
      .from(library_movies)
      .innerJoin(library, eq(library_movies.libraryId, library.id))
      .where(
        and(eq(library.userId, userId!), eq(library_movies.path, moviePath!))
      );
    if (userMovieAccess.length === 0) {
      throw new HTTPException(403, {
        message: "Access denied: Movie not found in user's library",
      });
    }
    await next();
  })
  .get(
    "/play",
    zValidator("query", playSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { moviePath } = c.req.valid("query");
      try {
        // 优先拿mp4
        const files = await fs.readdir(moviePath);
        const videoFile = files.find(
          (f) => f.endsWith(".mp4") || f.endsWith(".mkv")
        );

        if (!videoFile) {
          throw new HTTPException(404, {
            message: "Video file not found in directory",
          });
        }

        const originalPath = path.join(moviePath, videoFile);
        let playablePath = originalPath;
        if (path.extname(originalPath) === ".mkv") {
          const CACHE_DIR = path.join(moviePath, ".cache", "transcode");
          fs.mkdir(CACHE_DIR, { recursive: true });

          const cacheId = Buffer.from(originalPath).toString("base64url");
          const cachedFilePath = path.join(CACHE_DIR, `${cacheId}.mp4`);

          // 1. 检查缓存是否存在
          if (!existsSync(cachedFilePath)) {
            // --- 如果缓存不存在，则【等待】转换完成 ---
            try {
              await remuxToMp4(originalPath, cachedFilePath);
              // 转换完成后，将播放路径指向缓存文件
              playablePath = cachedFilePath;
            } catch (error) {
              // 如果 FFmpeg 转换失败，则抛出服务器错误
              console.error("FFMPEG conversion failed:", error);
              throw new HTTPException(500, {
                message: "Failed to process video file.",
              });
            }
          } else {
            // --- 如果缓存已存在，直接使用缓存文件 ---
            console.log(`Serving MKV from cache: ${cachedFilePath}`);
            playablePath = cachedFilePath;
          }
        }

        const signal = c.req.raw.signal;

        // Direct Play for MP4
        console.log(`Direct Play for: ${playablePath}`);
        const stats = await fs.stat(playablePath);
        const fileSize = stats.size;
        const rangeHeader = c.req.header("range");

        if (!rangeHeader) {
          throw new HTTPException(400, {
            message: "Range header is required",
          });
        }

        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          c.header("Content-Range", `bytes */${fileSize}`);
          throw new HTTPException(416, { message: "Range Not Satisfiable" });
        }

        const chunksize = end - start + 1;
        const nodeStream = createReadStream(playablePath, { start, end });
        const webStream = Readable.toWeb(nodeStream) as any;

        signal.onabort = () => {
          console.log(
            `Client disconnected from MP4 stream. Destroying file stream for: ${playablePath}`
          );
          nodeStream.destroy();
        };

        const headers = {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": chunksize.toString(),
        };

        return c.body(webStream, 206, headers);
      } catch (e) {
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  )
  .get("/movieInfo", async (c) => {})
  .get("/subtitles", async (c) => {});
