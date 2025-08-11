import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ScanMoviesRequest,
  type ScanMoviesResponse,
  type MovieSchema,
  type QueueData,
  BadRequestError,
} from "@/lib/types";
import { toast } from "sonner";
import { useState } from "react";

export const QUERY_KEYS = {
  MOVIE_LISTS: ["movie-lists"],
  QUEUE_STATUS: ["queue-status"],
};

export function useQueueMovies() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { movies: ScanMoviesRequest[] }>({
    mutationFn: async (body) => {
      await fetch("/api/movies/queue", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue-status"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useScanMovies() {
  const [scanMovies, setScanMovies] = useState<
    Array<ScanMoviesResponse["data"][number]>
  >([]);
  const scanMoviesMutation = useMutation<
    ScanMoviesResponse,
    BadRequestError,
    ScanMoviesRequest
  >({
    mutationFn: async (body) => {
      const response = await fetch("/api/movies/scan", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BadRequestError(errorData.error);
      }
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
  const key = QUERY_KEYS.MOVIE_LISTS;
  const movieListsQuery = useQuery<MovieSchema[]>({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch("/api/movies/lists");
      if (!response.ok) {
        throw new Error("Failed to fetch queue status");
      }
      return response.json();
    },
  });
  return { movieListsQuery, key };
}

export function useQueueStatus() {
  const key = QUERY_KEYS.QUEUE_STATUS;
  const queryClient = useQueryClient();
  const queueStatusQuery = useQuery<QueueData>({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch("/api/movies/queue-status");
      if (!response.ok) {
        throw new Error("Failed to fetch queue status");
      }
      return response.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.stats?.active === 0 ? false : 2000;
    },
  });

  if (queueStatusQuery.data?.stats.active === 0) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MOVIE_LISTS });
  }
  return { queueStatusQuery, key };
}
