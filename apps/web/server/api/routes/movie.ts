import { db } from "@next-media/db/db";
import { HTTPException } from "hono/http-exception";
import {
  hlsQueue,
  remuxToMp4Queue,
  tmdbApiRequestQueue,
} from "@next-media/worker/queue";
import {
  movie,
  library,
  library_movies,
  play_history,
} from "@next-media/db/schema";
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
import { getMovieInfo } from "@next-media/worker/utils";
import { spawn } from "node:child_process";
import { updateCacheItem } from "@next-media/worker/lru";

interface SubtitleTrackInfo {
  type: "embedded" | "external"; // 字幕来源：内封还是外部文件
  index?: number; // 如果是内封字幕，它的流索引
  lang?: string; // 语言代码 (e.g., "chi", "eng")
  title?: string; // 标题/描述 (e.g., "简体中文", "English SDH")
  path?: string; // 如果是外部文件，它的路径
}

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
  maxCacheBytes: z.number().optional(),
});

const movieStatusSchema = z.object({
  movieId: z.string(),
});

const watchedSchema = z.object({
  movieId: z.string(),
  libraryId: z.string(),
  isWatched: z.boolean(),
});

const directPlaySchema = z.object({
  moviePath: z.string(),
});

const remuxSchema = z.object({
  moviePath: z.string(),
  libraryId: z.string(),
  movieId: z.string(),
});

const movieInfoSchema = directPlaySchema.clone();
const subtitleListsSchema = directPlaySchema.clone();
const hlsPlaySchema = z.object({
  moviePath: z.string(),
  filename: z.string(),
});

const subtitleSchema = z.object({
  moviePath: z.string(),
  index: z.string(),
});

const remuxStatusSchema = z.object({
  jobId: z.string(),
  moviePath: z.string(),
});

const playHistorySchema = z.object({
  movieId: z.string(),
  progress: z.number(),
  totalTime: z.number(),
});

const updateCacheItemSchema = z.object({
  movieId: z.string(),
  libraryId: z.string(),
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
        isWatched: library_movies.isWatched,
        libraryId: library.id,
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
    zValidator("json", queueSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { movies: incomingMovies, maxCacheBytes } = c.req.valid("json");

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
          .values({
            id: nanoid(),
            userId: userId!,
            path: libraryPath,
            maxCacheBytes: maxCacheBytes ?? 1024 * 1024 * 1024 * 50,
          })
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
    "/movieStatus",
    zValidator("query", movieStatusSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { movieId } = c.req.valid("query");
      const result = await db
        .select({
          path: library_movies.path,
        })
        .from(library_movies)
        .innerJoin(library, eq(library_movies.libraryId, library.id))
        .innerJoin(movie, eq(library_movies.movieId, movie.id))
        .where(and(eq(library.userId, userId!), eq(movie.id, movieId)));

      if (result.length === 0) {
        throw new HTTPException(404, { message: "Movie not found" });
      }

      const playHistory = await db.query.play_history.findFirst({
        where: and(
          eq(play_history.movieId, movieId),
          eq(play_history.userId, userId!)
        ),
      });
      const leftTime = playHistory?.totalTime
        ? playHistory.totalTime - (playHistory.progress ?? 0)
        : 0;

      const leftTimeMinutes = Math.round(leftTime / 60);

      return c.json({
        path: result[0].path,
        progress: playHistory?.progress ?? 0,
        progressPercentage:
          playHistory?.progress && playHistory?.totalTime
            ? Math.round((playHistory.progress / playHistory.totalTime) * 100)
            : 0,
        leftTimeMinutes,
      });
    }
  )
  .post(
    "/playHistory",
    zValidator("json", playHistorySchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { movieId, progress, totalTime } = c.req.valid("json");

      const existingHistory = await db.query.play_history.findFirst({
        where: and(
          eq(play_history.movieId, movieId),
          eq(play_history.userId, userId!)
        ),
      });
      if (existingHistory) {
        await db
          .update(play_history)
          .set({ progress, totalTime })
          .where(eq(play_history.id, existingHistory.id));
      } else {
        await db.insert(play_history).values({
          id: nanoid(),
          movieId,
          userId: userId!,
          progress,
          totalTime,
        });
      }
      return c.json({ success: true });
    }
  )
  .post(
    "/updateCacheItem",
    zValidator("json", updateCacheItemSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { movieId, libraryId } = c.req.valid("json");
      await updateCacheItem({ userId: userId!, movieId, libraryId });
      return c.json({ success: true });
    }
  )
  .post(
    "/watched",
    zValidator("json", watchedSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { libraryId, movieId, isWatched } = c.req.valid("json");
      await db
        .update(library_movies)
        .set({ isWatched })
        .where(
          and(
            eq(library_movies.libraryId, libraryId),
            eq(library_movies.movieId, movieId)
          )
        );
      return c.json({ success: true });
    }
  )
  .use(async (c, next) => {
    const userId = c.get("user")?.id;
    let moviePath = c.req.query("moviePath");
    // 检查路径的最后一部分是否是 'remux' 或者 'hls'
    // 并且它的父目录是否是 '.cache'
    if (
      (path.basename(moviePath!) === "remux" ||
        path.basename(moviePath!) === "hls") &&
      path.basename(path.dirname(moviePath!)) === ".cache"
    ) {
      // 如果是，就取父目录的父目录，即向上跳两级
      moviePath = path.dirname(path.dirname(moviePath!));
    }
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
    "/directPlay",
    zValidator("query", directPlaySchema, (result) => {
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
        const webStream = Readable.toWeb(nodeStream) as ReadableStream;

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
        console.error(e);
        throw new HTTPException(404, { message: "Server Error", cause: e });
      }
    }
  )
  .get(
    "/hlsPlay",
    zValidator("query", hlsPlaySchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { moviePath, filename } = c.req.valid("query");

      if (filename.endsWith(".m3u8")) {
        // 如果是 m3u8 文件, 读取、修改、然后发送
        const filePath = path.join(moviePath, filename);
        try {
          const m3u8Content = await fs.readFile(filePath, "utf-8");

          // 将每一行 .ts 替换为完整的 API URL
          const modifiedContent = m3u8Content
            .split("\n")
            .map((line) => {
              if (line.trim().endsWith(".ts")) {
                const encodedPath = encodeURIComponent(moviePath);
                return `/api/movie/hlsPlay?filename=${line.trim()}&moviePath=${encodedPath}`;
              }
              return line;
            })
            .join("\n");

          c.header("Content-Type", "application/vnd.apple.mpegurl");
          return c.body(modifiedContent, 200);
        } catch (e) {
          console.error("Error reading m3u8 file:", e);
          throw new HTTPException(404, {
            message: "M3U8 file not found",
            cause: e,
          });
        }
      } else if (filename.endsWith(".ts")) {
        // 如果是 .ts 文件，直接返回文件内容
        const filePath = path.join(moviePath, filename);
        try {
          await fs.access(filePath);
          const nodeStream = createReadStream(filePath);
          const webStream = Readable.toWeb(nodeStream) as ReadableStream;
          c.header("Content-Type", "video/mp2t");
          return c.body(webStream, 200);
        } catch (e) {
          console.error("Error reading ts file:", e);
          throw new HTTPException(404, {
            message: "TS segment not found",
            cause: e,
          });
        }
      } else {
        throw new HTTPException(400, { message: "Unsupported file type" });
      }
    }
  )
  .get(
    "/remux",
    zValidator("query", remuxSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { moviePath, libraryId, movieId } = c.req.valid("query");
      const files = await fs.readdir(moviePath);
      const videoFile = files.find((f) => f.endsWith(".mkv"));
      if (!videoFile) {
        throw new HTTPException(404, { message: "Video file not found" });
      }

      const CACHE_DIR = path.join(moviePath, ".cache", "remux");
      fs.mkdir(CACHE_DIR, { recursive: true });
      const originalPath = path.join(moviePath, videoFile);
      const cacheId = Buffer.from(originalPath).toString("base64url");
      const cachedFilePath = path.join(CACHE_DIR, `${cacheId}.mp4`);

      const completedJobs = await remuxToMp4Queue.getJobs(["completed"]);
      const completedJob = completedJobs.find(
        (job) => job?.data?.inputPath === originalPath
      );

      const activeJobs = await remuxToMp4Queue.getJobs(["active", "waiting"]);
      const existingJob = activeJobs.find(
        (job) => job?.data?.inputPath === originalPath
      );

      if (completedJob) {
        console.log(
          `[Backend] 转码已经完成: ${originalPath}, Job ID: ${completedJob.id}`
        );
        return c.json({
          status: "COMPLETED",
          message: "Video processing has completed.",
          jobId: completedJob.id,
          outputPath: completedJob.data.outputPath,
        });
      }

      if (existingJob) {
        console.log(
          `[Backend] 转码进行中: ${originalPath}, Job ID: ${existingJob.id}`
        );
        return c.json({
          status: "PROCESSING",
          message: "Video is being processed. Please check back shortly.",
          jobId: existingJob.id,
          outputPath: existingJob.data.outputPath,
        });
      }

      const userLibrary = await db.query.library.findFirst({
        where: and(eq(library.userId, userId!), eq(library.id, libraryId)),
      });

      const fileSize = await fs.stat(originalPath);

      // 只对第一次转码进行缓存空间检查

      if (
        userLibrary?.maxCacheBytes &&
        fileSize.size > userLibrary?.maxCacheBytes
      ) {
        throw new HTTPException(400, {
          message: "The current file size exceeds the cache size",
        });
      }

      await remuxToMp4Queue.add(
        "remux-to-mp4",
        {
          inputPath: originalPath,
          outputPath: cachedFilePath,
          libraryId,
          userId,
          movieId,
        },
        { jobId: cacheId }
      );

      console.log(`[Backend] 添加新任务: ${originalPath}, Job ID: ${cacheId}`);
      return c.json({
        status: "QUEUED",
        message: "Video processing has started.",
        jobId: cacheId,
        outputPath: cachedFilePath,
      });
    }
  )
  .get(
    "/remuxProgress",
    zValidator("query", remuxStatusSchema, (result) => {
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
      const progress = await job.progress;
      return c.json({ progress });
    }
  )
  .get(
    "/hls",
    zValidator("query", remuxSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { moviePath, libraryId, movieId } = c.req.valid("query");
      const files = await fs.readdir(moviePath);
      const videoFile = files.find((f) => f.endsWith(".mkv"));
      if (!videoFile) {
        throw new HTTPException(404, { message: "Video file not found" });
      }

      const CACHE_DIR = path.join(moviePath, ".cache", "hls");
      fs.mkdir(CACHE_DIR, { recursive: true });
      const originalPath = path.join(moviePath, videoFile);
      const cacheId = Buffer.from(originalPath).toString("base64url");

      const completedJobs = await hlsQueue.getJobs(["completed"]);
      const completedJob = completedJobs.find(
        (job) => job?.data?.inputPath === originalPath
      );

      const activeJobs = await hlsQueue.getJobs(["active", "waiting"]);
      const existingJob = activeJobs.find(
        (job) => job?.data?.inputPath === originalPath
      );

      if (completedJob) {
        console.log(
          `[Backend] 转码已经完成: ${originalPath}, Job ID: ${completedJob.id}`
        );
        return c.json({
          status: "COMPLETED",
          message: "Video processing has completed.",
          jobId: completedJob.id,
          outputPath: completedJob.data.outputPath,
        });
      }

      if (existingJob) {
        console.log(
          `[Backend] 转码进行中: ${originalPath}, Job ID: ${existingJob.id}`
        );
        return c.json({
          status: "PROCESSING",
          message: "Video is being processed. Please check back shortly.",
          jobId: existingJob.id,
          outputPath: existingJob.data.outputPath,
        });
      }

      const userLibrary = await db.query.library.findFirst({
        where: and(eq(library.userId, userId!), eq(library.id, libraryId)),
      });

      const fileSize = await fs.stat(originalPath);

      // 只对第一次转码进行缓存空间检查

      if (
        userLibrary?.maxCacheBytes &&
        fileSize.size > userLibrary?.maxCacheBytes
      ) {
        throw new HTTPException(400, {
          message: "The current file size exceeds the cache size",
        });
      }

      await hlsQueue.add(
        "hls",
        {
          inputPath: originalPath,
          outputPath: CACHE_DIR,
          libraryId,
          userId,
          movieId,
        },
        { jobId: cacheId }
      );

      console.log(`[Backend] 添加新任务: ${originalPath}, Job ID: ${cacheId}`);
      return c.json({
        status: "QUEUED",
        message: "Video processing has started.",
        jobId: cacheId,
        outputPath: CACHE_DIR,
      });
    }
  )
  .get(
    "/hlsProgress",
    zValidator("query", remuxStatusSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { jobId } = c.req.valid("query");
      const job = await hlsQueue.getJob(jobId);
      if (!job) {
        throw new HTTPException(404, { message: "Job not found" });
      }
      const progress = await job.progress;
      return c.json({ progress });
    }
  )
  .get(
    "/movieInfo",
    zValidator("query", movieInfoSchema, (result) => {
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
        console.error(e);
        throw new HTTPException(404, { message: "Server Error", cause: e });
      }
    }
  )
  .get(
    "/subtitleLists",
    zValidator("query", subtitleListsSchema, (result) => {
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
            lang: srtFile.match(/\.(chi|eng|jpn)\./i)?.[1] || "und",
            title: path.basename(srtFile),
          });
        });

        return c.json(availableSubtitles);
      } catch (e) {
        console.error(e);
        throw new HTTPException(404, { message: "Server Error", cause: e });
      }
    }
  )
  .get(
    "/subtitle",
    zValidator("query", subtitleSchema, (result) => {
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
        const webStream = Readable.toWeb(
          ffmpegProcess.stdout
        ) as ReadableStream;
        c.header("Content-Type", "text/vtt; charset=UTF-8");
        return c.body(webStream, 200);
      } catch (e) {
        console.error(e);
        throw new HTTPException(404, { message: "Server Error", cause: e });
      }
    }
  );
