import { db } from "@/server/drizzle";
import client from "./hono";
import type { InferRequestType, InferResponseType } from "hono/client";
import { movie } from "@/server/drizzle/schema";

export type MovieListsRequestType = InferRequestType<
  typeof client.api.movie.lists.$get
>;

export type MovieListsResponseType = InferResponseType<
  typeof client.api.movie.lists.$get
>;

export type QueueMoviesRequestType = InferRequestType<
  typeof client.api.movie.queue.$post
>["json"];

export type QueueMoviesResponseType = InferResponseType<
  typeof client.api.movie.queue.$post
>;

export type QueueStatusRequestType = InferRequestType<
  typeof client.api.movie.queueStatus.$get
>;

export type QueueStatusResponseType = InferResponseType<
  typeof client.api.movie.queueStatus.$get
>;

export type ScanMoviesRequestType = InferRequestType<
  typeof client.api.scan.$post
>["json"];

export type ScanMoviesResponseType = InferResponseType<
  typeof client.api.scan.$post
>;

// infer drizzle orm type
//
// db.

export type Movie = typeof movie.$inferSelect;

export interface TmdbApiRequestJob {
  userId: string;
  libraryPath: string; // 库的根路径, e.g., "/data/movies"
  filePath: string; // 这部电影的原始文件夹名, e.g., "The Matrix 1999"
  movieTitle: string; // 从文件夹名解析出的电影标题
  year: string; // 从文件夹名解析出的年份
}

export interface TmdbMovieResponse {
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}
