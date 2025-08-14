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
import { createReadStream } from "node:fs";
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

const playSchema = z.object({
  moviePath: z.string(),
});

const moviePathSchema = z.object({
  tmdbId: z.string(),
});

export const movieRoute = new Hono<{ Variables: Variables }>()
  .get("/lists", async (c) => {
    const userId = c.get("user")?.id;
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

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
      if (!userId) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }

      const { movies: incomingMovies } = c.req.valid("json");

      if (incomingMovies.length === 0) {
        return c.json({ success: true, message: "No movies to process." });
      }

      const libraryPath = incomingMovies[0].libraryPath;

      let lib = await db.query.library.findFirst({
        where: and(eq(library.userId, userId), eq(library.path, libraryPath)),
      });

      if (!lib) {
        const newLibraries = await db
          .insert(library)
          .values({ id: nanoid(), userId, path: libraryPath })
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
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    const queueJobs = await tmdbApiRequestQueue.getJobs([
      "active",
      "waiting",
      "failed",
      "completed",
    ]);

    const userQueueJobs = queueJobs.filter((job) => job.data.userId === userId);

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
      if (!userId) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }
      const { tmdbId } = c.req.query();

      const result = await db
        .select({
          path: library_movies.path,
        })
        .from(library_movies)
        .innerJoin(library, eq(library_movies.libraryId, library.id))
        .innerJoin(movie, eq(library_movies.movieId, movie.id))
        .where(
          and(eq(library.userId, userId), eq(movie.tmdbId, parseInt(tmdbId)))
        );

      if (result.length === 0) {
        throw new HTTPException(404, { message: "Movie not found" });
      }
      return c.json({ path: result[0].path });
    }
  )
  .get(
    "/play",
    zValidator("query", playSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      if (!userId) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }
      const { moviePath } = c.req.valid("query");
      const userMovieAccess = await db
        .select({
          path: library_movies.path,
        })
        .from(library_movies)
        .innerJoin(library, eq(library_movies.libraryId, library.id))
        .where(
          and(eq(library.userId, userId), eq(library_movies.path, moviePath))
        );

      if (userMovieAccess.length === 0) {
        throw new HTTPException(403, {
          message: "Access denied: Movie not found in user's library",
        });
      }

      try {
        // 优先拿mp4
        const files = await fs.readdir(moviePath);
        const videoFile = files.find(
          (f) => f.endsWith(".mp4") || f.endsWith(".mkv")
        );

        const signal = c.req.raw.signal;

        if (!videoFile) {
          throw new HTTPException(404, {
            message: "Video file not found in directory",
          });
        }

        const fullPath = path.join(moviePath, videoFile);
        const extension = path.extname(videoFile);

        if (extension === ".mp4") {
          // --- 策略 A：Direct Play for MP4
          console.log(`Direct Play for: ${fullPath}`);
          const stats = await fs.stat(fullPath);
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
          const nodeStream = createReadStream(fullPath, { start, end });
          const webStream = Readable.toWeb(nodeStream) as any;

          signal.onabort = () => {
            console.log(
              `Client disconnected from MP4 stream. Destroying file stream for: ${fullPath}`
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
        } else if (extension === ".mkv") {
          console.log(`Remuxing for: ${fullPath}`);
          // 对于实时 remux，我们告诉浏览器我们在发送 mp4
          const headers = { "Content-Type": "video/mp4" };

          // FFmpeg 参数 - 使用分片式 MP4 的终极 movflags
          const ffmpegArgs = [
            "-i",
            fullPath,
            // 'frag_keyframe+empty_moov' 会创建一个分片式的、适合流式传输的 MP4。
            // 'faststart' 在这里作为补充，确保兼容性。
            "-movflags",
            "frag_keyframe+empty_moov+faststart",
            "-c",
            "copy", // 直接复制
            "-sn", // 移除字幕
            "-f",
            "mp4", // 输出格式为 mp4
            "pipe:1", // 输出到标准输出
          ];

          console.log("Attempting to process file:", fullPath);
          const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

          signal.onabort = () => {
            console.log(
              `Client disconnected from MKV remux. Terminating FFmpeg process for: ${fullPath}`
            );
            // This sends a SIGTERM signal to the FFmpeg process, killing it.
            ffmpegProcess.kill();
          };

          ffmpegProcess.stderr.on("data", (data) => {
            console.error(`FFmpeg stderr: ${data}`);
          });

          const webStream = Readable.toWeb(ffmpegProcess.stdout) as any;

          // TODO: 直接将流返回给客户端。状态码是 200 OK，因为我们没有处理 Range
          return c.body(webStream, 200, headers);
        }
      } catch (e) {
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  );
