import "dotenv/config";
import { type Job, Worker } from "bullmq";
import { connection } from "../redis";
import { library, movie } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../drizzle";
import { nanoid } from "nanoid";
import { TMDB_BASE_URL } from "@/lib/constant";
import type { TmdbApiRequestJob, TmdbMovieResponse } from "@/lib/types";

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN!;

export const tmdbApiRequestWorker = new Worker(
  "tmdb-api-requests",
  async (job: Job<TmdbApiRequestJob>) => {
    const { userId, libraryPath, folderName, movieTitle, year } = job.data;
    console.log(`Processing job ${job.id}: ${folderName}`);

    // =================================================================
    // 1. 检查用户对应的library是否存在, 不存在则创建
    // =================================================================

    let lib = await db.query.library.findFirst({
      where: and(eq(library.path, libraryPath), eq(library.userId, userId)),
    });

    if (!lib) {
      console.log(
        `Library path "${libraryPath}" not found for user. Creating...`
      );
      const newLibraries = await db
        .insert(library)
        .values({
          id: nanoid(),
          path: libraryPath,
          userId: userId,
        })
        .returning();
      lib = newLibraries[0];
      console.log(`Library created with ID: ${lib.id}`);
    }

    // =================================================================
    // 2. 检查电影是否已存在于此库中 (防止重复处理)
    // =================================================================
    const existingMovie = await db.query.movie.findFirst({
      where: and(eq(movie.libraryId, lib.id), eq(movie.folderName, folderName)),
    });

    if (existingMovie) {
      console.log(
        `Movie "${folderName}" already exists in the database. Skipping.`
      );
      return { message: "Movie already exists." };
    }

    // =================================================================
    // 3. 请求 TMDB API
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
      const errorText = await res.text();
      throw new Error(
        `TMDB API request failed with status ${res.status}: ${errorText}`
      );
    }

    const data = await res.json();
    const tmdbResult = data.results?.[0] as TmdbMovieResponse;

    if (!tmdbResult) {
      throw new Error(`No movie found on TMDB for query: "${movieTitle}"`);
    }

    // =================================================================
    // 4. 将获取到的数据存入数据库
    // =================================================================
    console.log(`Found TMDB ID: ${tmdbResult.id}. Saving to database...`);

    const newMovies = await db
      .insert(movie)
      .values({
        id: nanoid(),
        tmdbId: tmdbResult.id,
        name: tmdbResult.original_title,
        folderName: folderName,
        year: tmdbResult.release_date,
        overview: tmdbResult.overview,
        poster: tmdbResult.poster_path,
        libraryId: lib.id,
      })
      .returning();

    console.log(`Successfully saved movie "${newMovies[0].name}" to database.`);
    return newMovies[0]; // 将新创建的电影对象作为job的成功结果返回
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
