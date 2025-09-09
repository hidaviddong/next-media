import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { hc, type InferRequestType, type InferResponseType } from "hono/client";
import type { AppType } from "@next-media/api/client";
import { API_BASE_URL } from "@next-media/configs/constant";

const client = hc<AppType>(API_BASE_URL);

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

export const KEYS = {
  MOVIE_LISTS: ["movieLists"],
  QUEUE_STATUS: ["queueStatus"],
  MOVIE_STATUS: ["movieStatus"],
  MOVIE_INFO: ["movieInfo"],
  MOVIE_SUBTITLE_LISTS: ["movieSubtitleLists"],
  USER_LIBRARY: ["userLibrary"],
  USER_LIBRARY_CAPACITY: ["userLibraryCapacity"],
  MOVIE_PLAY: ["moviePlay"],
  MOVIE_REMUX: ["movieRemux"],
  MOVIE_REMUX_PROGRESS: ["movieRemuxProgress"],
  MOVIE_HLS: ["movieHls"],
  MOVIE_HLS_PROGRESS: ["movieHlsProgress"],
  MOVIE_PLAY_HISTORY: ["moviePlayHistory"],
};

export function useQueueMovies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: QueueMoviesRequestType) => {
      await client.api.movie.queue.$post({
        json: {
          movies: body.movies,
          maxCacheBytes: body.maxCacheBytes,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.QUEUE_STATUS });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useScanMovies() {
  const [scanMovies, setScanMovies] = useState<
    Array<ScanMoviesResponseType["data"][number]>
  >([]);
  const scanMoviesMutation = useMutation({
    mutationFn: async (body: ScanMoviesRequestType) => {
      const response = await client.api.scan.$post({
        json: body,
      });

      return response.json();
    },
    onSuccess: (data) => {
      setScanMovies(data.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  return { scanMovies, setScanMovies, ...scanMoviesMutation };
}

export function useMovieLists() {
  const movieListsQuery = useQuery({
    queryKey: [...KEYS.MOVIE_LISTS],
    queryFn: async () => {
      const response = await client.api.movie.lists.$get();
      return response.json();
    },
  });
  return { movieListsQuery };
}

export function useQueueStatus() {
  const queryClient = useQueryClient();
  const queueStatusQuery = useQuery({
    queryKey: [...KEYS.QUEUE_STATUS],
    queryFn: async () => {
      const response = await client.api.movie.queueStatus.$get();
      return response.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.stats.active === 0 ? false : 2000;
    },
  });

  if (queueStatusQuery.data?.stats.active === 0) {
    queryClient.invalidateQueries({ queryKey: [...KEYS.MOVIE_LISTS] });
    queryClient.invalidateQueries({ queryKey: [...KEYS.USER_LIBRARY] });
    queryClient.invalidateQueries({
      queryKey: [...KEYS.USER_LIBRARY_CAPACITY],
    });
  }
  return { queueStatusQuery };
}
export function useMovieStatus(movieId: string) {
  const movieStatusQuery = useQuery({
    queryKey: [...KEYS.MOVIE_STATUS, movieId],
    queryFn: async () => {
      const response = await client.api.movie.movieStatus.$get({
        query: { movieId },
      });
      return response.json();
    },
  });

  return { movieStatusQuery };
}

export function useMovieInfo(moviePath: string) {
  const movieInfoQuery = useQuery({
    queryKey: [...KEYS.MOVIE_INFO, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.movieInfo.$get({
        query: { moviePath },
      });
      return response.json();
    },
  });

  return { movieInfoQuery };
}

export function useMovieSubtitleLists(moviePath: string) {
  const movieSubtitleListsQuery = useQuery({
    queryKey: [...KEYS.MOVIE_SUBTITLE_LISTS, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.subtitleLists.$get({
        query: { moviePath },
      });
      return response.json();
    },
  });
  return { movieSubtitleListsQuery };
}

export function useUserLibrary() {
  const userLibraryQuery = useQuery({
    queryKey: [...KEYS.USER_LIBRARY],
    queryFn: async () => {
      const response = await client.api.user.library.$get();
      return response.json();
    },
  });
  return { userLibraryQuery };
}

export function useUserLibraryCapacity(libraryPath: string) {
  const userLibraryCapacityQuery = useQuery({
    queryKey: [...KEYS.USER_LIBRARY_CAPACITY],
    queryFn: async () => {
      const response = await client.api.scan.capacity.$get({
        query: { libraryPath },
      });
      return response.json();
    },
    enabled: !!libraryPath,
  });
  return { userLibraryCapacityQuery };
}

export function useMovieRemux(
  moviePath: string,
  libraryId: string,
  movieId: string,
  movieType?: MovieType
) {
  const movieRemuxQuery = useQuery({
    queryKey: [...KEYS.MOVIE_REMUX, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.remux.$get({
        query: { moviePath, libraryId, movieId },
      });
      return response.json();
    },
    enabled: movieType === "remux",
  });
  return { movieRemuxQuery };
}

export function useMovieRemuxProgress(jobId: string, moviePath: string) {
  const movieRemuxProgressQuery = useQuery({
    queryKey: [...KEYS.MOVIE_REMUX_PROGRESS, jobId, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.remuxProgress.$get({
        query: { jobId, moviePath },
      });
      if (!response.ok) {
        const errorData = await response.text();
        toast.error(errorData);
      }
      return response.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.progress === 100 ? false : 1000;
    },
    enabled: !!jobId,
  });
  return { movieRemuxProgressQuery };
}

export function useMovieHls(
  moviePath: string,
  libraryId: string,
  movieId: string,
  movieType?: MovieType
) {
  const movieHlsQuery = useQuery({
    queryKey: [...KEYS.MOVIE_HLS, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.hls.$get({
        query: { moviePath, libraryId, movieId },
      });
      if (!response.ok) {
        const errorData = await response.text();
        toast.error(errorData);
      }
      return response.json();
    },
    enabled: movieType === "hls",
  });
  return { movieHlsQuery };
}
export function useMovieHlsProgress(jobId: string, moviePath: string) {
  const movieHlsProgressQuery = useQuery({
    queryKey: [...KEYS.MOVIE_HLS_PROGRESS, jobId],
    queryFn: async () => {
      const response = await client.api.movie.hlsProgress.$get({
        query: { jobId, moviePath },
      });
      return response.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.progress === 100 ? false : 1000;
    },
    enabled: !!jobId,
  });
  return { movieHlsProgressQuery };
}

export function useMoviePlayHistory() {
  const queryClient = useQueryClient();
  const moviePlayHistoryMutation = useMutation({
    mutationFn: async (body: PlayHistoryRequestType) => {
      const response = await client.api.movie.playHistory.$post({
        json: body,
      });
      return response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.MOVIE_STATUS });
    },
  });
  return { moviePlayHistoryMutation };
}

export function useUpdateCacheItem() {
  const updateCacheItemMutation = useMutation({
    mutationFn: async (body: UpdateCacheItemRequestType) => {
      const response = await client.api.movie.updateCacheItem.$post({
        json: body,
      });
      return response.json();
    },
  });
  return { updateCacheItemMutation };
}

export function useMovieWatched() {
  const queryClient = useQueryClient();
  const movieWatchedMutation = useMutation({
    mutationFn: async (body: MovieWatchedRequestType) => {
      const response = await client.api.movie.watched.$post({
        json: body,
      });
      return response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.MOVIE_LISTS });
    },
  });
  return { movieWatchedMutation };
}
