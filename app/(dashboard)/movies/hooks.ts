import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ScanMoviesRequestType,
  type ScanMoviesResponseType,
  type QueueMoviesRequestType,
} from "@/lib/types";
import { toast } from "sonner";
import { useState } from "react";
import client from "@/lib/hono";

export const KEYS = {
  MOVIE_LISTS: ["movieLists"],
  QUEUE_STATUS: ["queueStatus"],
  MOVIE_PATH: ["moviePath"],
  MOVIE_INFO: ["movieInfo"],
};

export function useQueueMovies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: QueueMoviesRequestType) => {
      await client.api.movie.queue.$post({
        json: {
          movies: body.movies,
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
  const key = KEYS.MOVIE_LISTS;
  const movieListsQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await client.api.movie.lists.$get();
      return response.json();
    },
  });
  return { movieListsQuery, key };
}

export function useQueueStatus() {
  const key = KEYS.QUEUE_STATUS;
  const queryClient = useQueryClient();
  const queueStatusQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await client.api.movie.queueStatus.$get();
      return response.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.stats.active === 0 ? false : 2000;
    },
  });

  if (queueStatusQuery.data?.stats.active === 0) {
    queryClient.invalidateQueries({ queryKey: KEYS.MOVIE_LISTS });
  }
  return { queueStatusQuery, key };
}
export function useMoviePath(tmdbId: string) {
  const moviePathQuery = useQuery({
    queryKey: [KEYS.MOVIE_PATH, tmdbId],
    queryFn: async () => {
      const response = await client.api.movie.moviePath.$get({
        query: { tmdbId },
      });
      return response.json();
    },
  });

  return { moviePathQuery };
}

export function useMovieInfo(moviePath: string) {
  const movieInfoQuery = useQuery({
    queryKey: [KEYS.MOVIE_INFO, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.movieInfo.$get({
        query: { moviePath },
      });
      return response.json();
    },
  });

  return { movieInfoQuery };
}
