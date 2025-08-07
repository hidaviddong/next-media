import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../lib/redis";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN!;

interface TmdbApiRequestJob {
  name: string;
  year: string;
}

interface TmdbMovie {
  id: number;
  title: string;
  year: string;
  overview: string;
  poster: string;
}

export async function searchMovieByTitle(
  title: string,
  year?: string
): Promise<TmdbMovie | null> {
  const url = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
    title
  )}${year ? `&year=${year}` : ""}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
    },
  });
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.statusText}`);
  const data = await res.json();
  const first = data.results?.[0]; // 用第一个结果展示
  if (!first) return null;
  return {
    id: first.id,
    title: first.original_title,
    year: first.release_date?.split("-")[0] || "",
    overview: first.overview,
    poster: first.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${first.poster_path}`
      : "",
  };
}

export const tmdbApiRequestWorker = new Worker(
  "tmdb-api-requests",
  async (job) => {
    const { name, year } = job.data as TmdbApiRequestJob;
    console.log(`${name} ${year} 去请求 tmdb api`);
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
