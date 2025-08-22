import {
  createLibrary,
  getLibrary,
  getLibraryMoviesByLibraryId,
  getMoviePathByTmdbIdAndUserId,
  getMoviesByUserId,
  getUserMovieAccess,
} from "@next-media/db/db";
import { HTTPException } from "hono/http-exception";
import {
  hlsQueue,
  remuxToMp4Queue,
  tmdbApiRequestQueue,
} from "@next-media/queue/queue";
import { Hono } from "hono";
import type { Variables } from "../types.js";
import z from "zod";
import { zValidator } from "@hono/zod-validator";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import type { SubtitleTrackInfo, MovieType } from "@next-media/types";
import { getMovieInfo } from "../utils.js";
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

const directPlaySchema = z.object({
  moviePath: z.string(),
});

const remuxSchema = directPlaySchema.clone();
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
    const userMovies = await getMoviesByUserId(userId!);
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

      const libraryPath = incomingMovies[0]!.libraryPath;

      let lib = await getLibrary(userId!, libraryPath);

      if (!lib) {
        const newLibraries = await createLibrary(userId!, libraryPath);
        lib = newLibraries[0];
      }

      const existingLinks = await getLibraryMoviesByLibraryId(lib!.id);

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
      const { tmdbId } = c.req.valid("query");
      const result = await getMoviePathByTmdbIdAndUserId(tmdbId, userId!);

      if (result.length === 0 || !result[0]?.path) {
        throw new HTTPException(404, { message: "Movie not found" });
      }
      return c.json({ path: result[0].path });
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
    if (!moviePath) {
      throw new HTTPException(400, { message: "No movie path provided" });
    }

    const userMovieAccess = await getUserMovieAccess(userId!, moviePath);

    if (userMovieAccess.length === 0) {
      throw new HTTPException(403, {
        message: "Access denied: Movie not found in user's library",
      });
    }
    await next();
  })
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
        const start = parseInt(parts[0]!, 10);
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
        console.error(e);
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  )
  .get(
    "/hlsPlay",
    zValidator("query", hlsPlaySchema, (result, c) => {
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
        } catch (error) {
          console.error("Error reading m3u8 file:", error);
          throw new HTTPException(404, { message: "M3U8 file not found" });
        }
      } else if (filename.endsWith(".ts")) {
        // 如果是 .ts 文件，直接返回文件内容
        const filePath = path.join(moviePath, filename);
        try {
          await fs.access(filePath);
          const nodeStream = createReadStream(filePath);
          const webStream = Readable.toWeb(nodeStream) as any;
          c.header("Content-Type", "video/mp2t");
          return c.body(webStream, 200);
        } catch (error) {
          console.error("Error reading ts file:", error);
          throw new HTTPException(404, { message: "TS segment not found" });
        }
      } else {
        throw new HTTPException(400, { message: "Unsupported file type" });
      }
    }
  )
  .get(
    "/remux",
    zValidator("query", remuxSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { moviePath } = c.req.valid("query");
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

      await remuxToMp4Queue.add(
        "remux-to-mp4",
        {
          inputPath: originalPath,
          outputPath: cachedFilePath,
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
      const progress = await job.progress;
      return c.json({ progress });
    }
  )
  .get(
    "/hls",
    zValidator("query", remuxSchema, (result, c) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { moviePath } = c.req.valid("query");
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

      await hlsQueue.add(
        "hls",
        {
          inputPath: originalPath,
          outputPath: CACHE_DIR,
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
    zValidator("query", remuxStatusSchema, (result, c) => {
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
        console.error(e);
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
