import { db } from "@/server/drizzle";
import { tmdbApiRequestQueue } from "@/server/redis";
import { movie, library } from "@/server/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { Variables } from "../type";
import z from "zod";
import { zValidator } from "@hono/zod-validator";

const queueSchema = z.object({
  movies: z.array(
    z.object({
      libraryPath: z.string(),
    })
  ),
});

const app = new Hono<{ Variables: Variables }>()
  .get("/lists", async (c) => {
    const userId = c.get("user")?.id;
    const userMovies = await db
      .select()
      .from(movie)
      .innerJoin(library, eq(movie.libraryId, library.id))
      .where(eq(library.userId, userId!))
      .orderBy(desc(movie.createdAt));
    return c.json(userMovies);
  })
  .post(
    "/queue",
    zValidator("json", queueSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: "Invalid request" }, { status: 400 });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { movies } = c.req.valid("json");
      tmdbApiRequestQueue.addBulk(
        movies.map((movie) => ({
          name: "tmdb-api-request",
          data: {
            ...movie,
            userId,
          },
        }))
      );
      return c.json({ success: true }, { status: 200 });
    }
  )
  .get("/queue-status", async (c) => {
    const userId = c.get("user")?.id;
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
  });

export default app;
