import { db } from "@/server/drizzle";
import { HTTPException } from "hono/http-exception";
import { remuxToMp4Queue, tmdbApiRequestQueue } from "@/server/redis";
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
import { getMovieInfo, SubtitleTrackInfo, waitForFile } from "@/server/utils";
import { spawn } from "node:child_process";

type MovieType = "direct" | "remux" | "hls";

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
  type: z.enum(["direct", "remux", "hls"]),
});

const directPlaySchema = z.object({
  moviePath: z.string(),
});

const remuxSchema = z.object({
  moviePath: z.string(),
});
const movieInfoSchema = directPlaySchema.clone();
const subtitleListsSchema = directPlaySchema.clone();

const subtitleSchema = z.object({
  moviePath: z.string(),
  index: z.string(),
});

const remuxStatusSchema = z.object({
  jobId: z.string(),
});

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
  // .use(async (c, next) => {
  //   const userId = c.get("user")?.id;
  //   let moviePath = c.req.query("moviePath");
  //   if (!moviePath) {
  //     const body = await c.req.json();
  //     moviePath = body.moviePath;
  //   }
  //   const userMovieAccess = await db
  //     .select({
  //       path: library_movies.path,
  //     })
  //     .from(library_movies)
  //     .innerJoin(library, eq(library_movies.libraryId, library.id))
  //     .where(
  //       and(eq(library.userId, userId!), eq(library_movies.path, moviePath!))
  //     );
  //   if (userMovieAccess.length === 0) {
  //     throw new HTTPException(403, {
  //       message: "Access denied: Movie not found in user's library",
  //     });
  //   }
  //   await next();
  // })
  .get(
    "/directPlay",
    zValidator("query", directPlaySchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      try {
        const { moviePath } = c.req.valid("query");
        const files = await fs.readdir(moviePath);
        const videoFile = files.find((f) => f.endsWith(".mp4"));
        if (!videoFile) {
          throw new HTTPException(404, { message: "Video file not found" });
        }
        const originalPath = path.join(moviePath, videoFile);
        const signal = c.req.raw.signal;
        const stats = await fs.stat(originalPath);
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
          throw new HTTPException(416, {
            message: "Range Not Satisfiable",
          });
        }

        const chunksize = end - start + 1;
        const nodeStream = createReadStream(originalPath, { start, end });
        const webStream = Readable.toWeb(nodeStream) as any;

        signal.onabort = () => {
          console.log(
            `Client disconnected from MP4 stream. Destroying file stream for: ${moviePath}`
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
        console.log(e);
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  )
  .post(
    "/remux",
    zValidator("json", remuxSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { moviePath } = c.req.valid("json");
      const files = await fs.readdir(moviePath);
      const videoFile = files.find((f) => f.endsWith(".mkv"));
      if (!videoFile) {
        throw new HTTPException(404, { message: "Video file not found" });
      }
      const CACHE_DIR = path.join(moviePath, ".cache", "transcode");
      fs.mkdir(CACHE_DIR, { recursive: true });
      const originalPath = path.join(moviePath, videoFile);
      const cacheId = Buffer.from(originalPath).toString("base64url");
      const cachedFilePath = path.join(CACHE_DIR, `${cacheId}.mp4`);
      if (existsSync(cachedFilePath)) {
        return c.json({
          status: "READY",
          message: "Video is ready to play.",
          cachedFilePath: cachedFilePath,
        });
      } else {
        const jobId = `remux:${cacheId}`;
        const existingJob = await remuxToMp4Queue.getJob(jobId);
        if (
          existingJob &&
          !(await existingJob.isCompleted()) &&
          !(await existingJob.isFailed())
        ) {
          console.log(`Job ${jobId} is already in the queue or active.`);
          return c.json(
            {
              status: "PROCESSING",
              message: "Video is being prepared. Please check back shortly.",
              jobId: jobId,
            },
            202
          );
        } else {
          console.log(`Adding job ${jobId} to remux-to-mp4queue`);
          await remuxToMp4Queue.add(
            "remux-to-mp4",
            {
              inputPath: originalPath,
              outputPath: cachedFilePath,
            },
            { jobId }
          );

          return c.json(
            {
              status: "QUEUED",
              message: "Video processing has started.",
              jobId: jobId,
            },
            202
          );
        }
      }
    }
  )
  .get(
    "/remuxProgress",
    zValidator("query", remuxStatusSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { jobId } = c.req.valid("query");
      const job = await remuxToMp4Queue.getJob(jobId);
      if (!job) {
        throw new HTTPException(404, { message: "Job not found" });
      }
      const progress = await job.getProgress();
      return c.json({ progress });
    }
  )
  .get(
    "/playHls/*",
    zValidator("query", playSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      try {
        const { moviePath } = c.req.valid("query");
        const HLS_CACHE_DIR = path.join(moviePath, ".cache", "hls");
        await fs.mkdir(HLS_CACHE_DIR, { recursive: true });

        const requestedFile = path.basename(c.req.path);
        const requestedFilePath = path.join(HLS_CACHE_DIR, requestedFile);
        const lockFilePath = path.join(HLS_CACHE_DIR, "transcoding.lock");

        // === .m3u8 请求处理逻辑 ===
        if (requestedFile.endsWith(".m3u8")) {
          // 只有在转码未开始时才启动 ffmpeg
          if (!existsSync(lockFilePath)) {
            if (existsSync(HLS_CACHE_DIR)) {
              await fs.rm(HLS_CACHE_DIR, { recursive: true, force: true });
              await fs.mkdir(HLS_CACHE_DIR, { recursive: true });
            }
            await fs.writeFile(lockFilePath, "locked");

            const files = await fs.readdir(moviePath);
            const videoFile = files.find(
              (f) => f.endsWith(".mp4") || f.endsWith(".mkv")
            );
            if (!videoFile)
              throw new HTTPException(404, { message: "Video not found" });

            const videoFullPath = path.join(moviePath, videoFile);
            const m3u8AbsolutePath = path.join(HLS_CACHE_DIR, "output.m3u8");

            const ffmpegArgs = [
              "-y",
              "-i",
              videoFullPath,
              "-c:v",
              "copy",
              "-c:a",
              "aac",
              "-b:a",
              "192k",
              "-sn",
              "-f",
              "hls",
              "-hls_time",
              "4",
              "-hls_list_size",
              "0",
              "-hls_segment_filename",
              path.join(HLS_CACHE_DIR, "segment%03d.ts"),
              m3u8AbsolutePath,
            ];

            const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);
            // (你的 ffmpeg 日志和事件处理逻辑保持不变)
            ffmpegProcess.stderr.on("data", (data) =>
              console.log(`[FFMPEG-HLS]: ${data.toString()}`)
            );
            ffmpegProcess.on("error", (error) => {
              console.error(`[FFMPEG-HLS-ERROR]: ${error.message}`);
              fs.unlink(lockFilePath).catch(() => {});
            });
            ffmpegProcess.on("close", () => {
              console.log(
                `[FFMPEG-HLS-CLOSE]: Transcoding finished for ${moviePath}`
              );
              fs.unlink(lockFilePath).catch(() => {});
            });
            c.req.raw.signal.onabort = () => {
              console.log("Client disconnected, killing FFmpeg process.");
              ffmpegProcess.kill();
            };
          }

          // 等待 m3u8 文件被 ffmpeg 创建
          await waitForFile(requestedFilePath, 20000);

          // 【关键】读取、修改并返回 m3u8 内容
          const originalContent = await fs.readFile(requestedFilePath, "utf-8");
          const modifiedContent = originalContent
            .split("\n")
            .map((line) =>
              line.trim().endsWith(".ts")
                ? `${line}?moviePath=${encodeURIComponent(moviePath)}`
                : line
            )
            .join("\n");

          c.header("Content-Type", "application/vnd.apple.mpegurl");
          return c.body(modifiedContent);
        }

        // === .ts 请求处理逻辑 ===
        else if (requestedFile.endsWith(".ts")) {
          // 由于 m3u8 已被修改，这里的请求将包含 moviePath，因此权限中间件会通过
          await waitForFile(requestedFilePath, 10000);

          if (
            !existsSync(requestedFilePath) ||
            !path
              .resolve(requestedFilePath)
              .startsWith(path.resolve(HLS_CACHE_DIR))
          ) {
            throw new HTTPException(404, { message: "Segment not found" });
          }

          const fileStream = createReadStream(requestedFilePath);
          const webStream = Readable.toWeb(fileStream) as any;
          c.header("Content-Type", "video/mp2t");
          return c.body(webStream, 200);
        }

        // 捕获其他不合法请求
        else {
          throw new HTTPException(400, { message: "Invalid HLS request." });
        }
      } catch (e: any) {
        console.error("playHls error", e);
        if (e instanceof HTTPException) throw e;
        throw new HTTPException(500, { message: "Server Error" });
      }
    }
  )
  .get(
    "/movieInfo",
    zValidator("query", movieInfoSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { moviePath } = c.req.valid("query");
      try {
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
        const movieInfo = await getMovieInfo(originalPath);
        const videoStream = movieInfo.streams.find(
          (stream) => stream.codec_type === "video"
        );
        const audioStream = movieInfo.streams.find(
          (stream) => stream.codec_type === "audio"
        );
        const isVideoSupported = videoStream?.codec_name === "h264";
        const isAudioSupported = audioStream?.codec_name === "aac";
        let type: MovieType = "direct";
        if (path.extname(originalPath) === ".mkv") {
          if (isVideoSupported && isAudioSupported) {
            type = "remux";
          } else {
            type = "hls";
          }
        }
        return c.json({
          type,
          movieInfo,
        });
      } catch (e) {
        console.log(e);
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  )
  .get(
    "/subtitleLists",
    zValidator("query", subtitleListsSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { moviePath } = c.req.valid("query");
      const availableSubtitles: SubtitleTrackInfo[] = [];
      try {
        const files = await fs.readdir(moviePath);
        const videoFile = files.find((f) => f.endsWith(".mkv"));

        if (!videoFile) {
          throw new HTTPException(404, { message: "Video file not found" });
        }
        const videoFullPath = path.join(moviePath, videoFile);
        const mediaInfo = await getMovieInfo(videoFullPath);
        const embeddedStreams = mediaInfo.streams.filter(
          (s) => s.codec_type === "subtitle"
        );
        // 1. 内封字幕
        embeddedStreams.forEach((stream) => {
          availableSubtitles.push({
            type: "embedded",
            index: stream.index,
            lang: stream.tags?.language || "und",
            title: stream.tags?.title || `未知字幕 (Stream #${stream.index})`,
          });
        });

        // --- 2. 查找外部字幕文件 ---
        const externalSrtFiles = files.filter(
          (f) => f.endsWith(".srt") || f.endsWith(".ass")
        );
        externalSrtFiles.forEach((srtFile) => {
          availableSubtitles.push({
            type: "external",
            path: path.join(moviePath, srtFile),
            lang: srtFile.match(/\.(chi|eng|jpn)\./i)?.[1] || "und", // 简单的语言猜测
            title: path.basename(srtFile),
          });
        });

        return c.json(availableSubtitles);
      } catch (e) {
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  )
  .get(
    "/subtitle",
    zValidator("query", subtitleSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: result.error.message });
      }
    }),
    async (c) => {
      const { moviePath, index } = c.req.valid("query");

      try {
        const files = await fs.readdir(moviePath);
        // 字幕要从 mkv 里面拿
        const videoFile = files.find((f) => f.endsWith(".mkv"));

        if (!videoFile) {
          throw new HTTPException(404, { message: "Video file not found" });
        }

        const videoFullPath = path.join(moviePath, videoFile);

        console.log(
          `Extracting embedded subtitle #${index} from ${videoFullPath}`
        );

        const ffmpegArgs = [
          "-i",
          videoFullPath,
          "-map",
          `0:${index}`,
          "-c:s",
          "webvtt",
          "-f",
          "webvtt",
          "pipe:1",
        ];

        const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);
        const webStream = Readable.toWeb(ffmpegProcess.stdout) as any;
        c.header("Content-Type", "text/vtt; charset=UTF-8");
        return c.body(webStream, 200);
      } catch (e) {
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  );
