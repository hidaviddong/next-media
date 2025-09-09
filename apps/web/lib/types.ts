import client from "./hono";
import type { InferRequestType, InferResponseType } from "hono/client";
import { movie } from "@next-media/db/schema";

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

export type UpdateCacheItemRequestType = InferRequestType<
  typeof client.api.movie.updateCacheItem.$post
>["json"];

export type MovieWatchedRequestType = InferRequestType<
  typeof client.api.movie.watched.$post
>["json"];

export type MovieType = MovieInfoResponseType["type"];

export type Movie = typeof movie.$inferSelect;
