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

export type SubtitleListsResponseType = InferResponseType<
  typeof client.api.movie.subtitleLists.$get
>;

export type MovieInfoResponseType = InferResponseType<
  typeof client.api.movie.movieInfo.$get
>;

export type MovieStatusResponseType = InferResponseType<
  typeof client.api.movie.movieStatus.$get
>;

export type PlayHistoryRequestType = InferRequestType<
  typeof client.api.movie.playHistory.$post
>["json"];

export type PlayHistoryResponseType = InferResponseType<
  typeof client.api.movie.playHistory.$post
>;

export type MovieType = MovieInfoResponseType["type"];

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

export interface RemuxToMp4Job {
  inputPath: string;
  outputPath: string;
}

export interface HlsJob {
  inputPath: string;
  outputPath: string;
}
