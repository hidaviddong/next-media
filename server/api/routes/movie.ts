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
        const movieName = moviePath.split("/").pop();
        const fullPath = `${moviePath}/${movieName}.mp4`;
        const stats = await fs.stat(fullPath);
        const fileSize = stats.size;
        const rangeHeader = c.req.header("range");
        const headers = {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
        };

        if (!rangeHeader) {
          throw new HTTPException(400, {
            message: "Should add range in request header",
          });
        } else {
          // 有rangeHeader 解析
          // 1. 手动解析 Range 头 (例如 "bytes=0-1023")
          const parts = rangeHeader.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          // 如果 parts[1] 不存在 (例如 "bytes=1024-")，则表示请求到文件末尾。
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          // 2. 健壮性检查：确保请求的范围在文件大小之内。
          if (start >= fileSize || end >= fileSize || start > end) {
            c.header("Content-Range", `bytes */${fileSize}`);
            return c.json({
              success: false,
              message: "Range Not Satisfiable",
            });
          }

          // 3. 计算本次请求要发送的数据块大小。
          const chunksize = end - start + 1;

          // 4. 创建一个只读取文件特定部分的 Node.js 流。
          const nodeStream = createReadStream(fullPath, { start, end });
          const webStream = Readable.toWeb(nodeStream) as any;

          // 5. 构建流式响应的特定头。
          const streamHeaders = {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Content-Length": chunksize.toString(),
          };

          // 6. 返回 206 Partial Content 状态码和部分文件流。
          return c.body(webStream, 206, streamHeaders);
        }
      } catch (e) {
        throw new HTTPException(404, { message: "Server Error" });
      }
    }
  );
