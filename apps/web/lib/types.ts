import client from "./hono";
import type { InferRequestType, InferResponseType } from "hono/client";
import { movie } from "@next-media/db/schema";

export type MovieDetailRequestType = InferRequestType<
  typeof client.api.movie.detail.$get
>;

export type MovieDetailResponseType = InferResponseType<
  typeof client.api.movie.detail.$get
>;

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

export type MovieType = MovieInfoResponseType["type"];

export type Movie = typeof movie.$inferSelect;
