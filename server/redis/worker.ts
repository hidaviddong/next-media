import "dotenv/config";
import { type Job, Worker } from "bullmq";
import { connection } from "../redis";
import { library, movie, library_movies } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../drizzle";
import { nanoid } from "nanoid";
import { TMDB_BASE_URL } from "@/lib/constant";
import type {
  TmdbApiRequestJob,
  TmdbMovieResponse,
  RemuxToMp4Job,
} from "@/lib/types";
import path from "node:path";
import { remuxToMp4 } from "../utils";

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN!;

export const tmdbApiRequestWorker = new Worker(
  "tmdb-api-requests",
  async (job: Job<TmdbApiRequestJob>) => {
    const { userId, libraryPath, filePath, movieTitle, year } = job.data;
    console.log(`Processing job ${job.id} for file: ${filePath}`);

    // =================================================================
    // 1. 获取 Library (逻辑不变)
    // =================================================================
    const lib = await db.query.library.findFirst({
      where: and(eq(library.path, libraryPath), eq(library.userId, userId)),
    });
    if (!lib) {
      throw new Error(
        `Library with path "${libraryPath}" not found for user ${userId}`
      );
    }

    // =================================================================
    // 2. 请求 TMDB API
    // =================================================================
    console.log(`Fetching TMDB data for: "${movieTitle}" (${year})`);
    const url = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
      movieTitle
    )}${year ? `&year=${year}` : ""}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      },
    });

    if (!res.ok) {
      throw new Error(`TMDB API request failed`);
    }
    const data = await res.json();
    const tmdbResult = data.results?.[0] as TmdbMovieResponse;

    console.log("tmdbResult", tmdbResult);

    if (!tmdbResult) {
      throw new Error(`No movie found on TMDB for query: "${movieTitle}"`);
    }
    console.log(`Found TMDB ID: ${tmdbResult.id}.`);

    // =================================================================
    // 3. 查找或创建电影主数据
    //    确保电影元数据在 `movie` 表中是唯一的。
    // =================================================================

    let movieRecord = await db.query.movie.findFirst({
      where: eq(movie.tmdbId, tmdbResult.id),
    });

    if (!movieRecord) {
      const newMovies = await db
        .insert(movie)
        .values({
          id: nanoid(),
          tmdbId: tmdbResult.id,
          name: tmdbResult.title,
          overview: tmdbResult.overview,
          year: tmdbResult.release_date,
          poster: tmdbResult.poster_path,
        })
        .returning();
      movieRecord = newMovies[0];
    }

    const existingLink = await db.query.library_movies.findFirst({
      where: and(
        eq(library_movies.libraryId, lib.id),
        eq(library_movies.movieId, movieRecord.id)
      ),
    });

    if (existingLink) {
      console.log(
        `Movie "${movieRecord.name}" is already linked to library "${lib.path}". Skipping.`
      );
      return { message: "Movie already linked." };
    }

    await db.insert(library_movies).values({
      libraryId: lib.id,
      movieId: movieRecord.id,
      path: path.join(libraryPath, filePath),
    });

    console.log(
      `Successfully linked movie "${movieRecord.name}" from path "${filePath}" to library "${lib.path}".`
    );
    return { success: true };
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 5,
      duration: 2000,
    },
  }
);

tmdbApiRequestWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

tmdbApiRequestWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});

export const remuxToMp4Worker = new Worker(
  "remux-to-mp4",
  async (job: Job<RemuxToMp4Job>) => {
    const { inputPath, outputPath } = job.data;
    await remuxToMp4(inputPath, outputPath, (progress: number) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
      job.updateProgress(progress);
    });
  },
  {
    connection,
  }
);

remuxToMp4Worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

remuxToMp4Worker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
