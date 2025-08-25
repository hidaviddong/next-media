import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ScanMoviesRequestType,
  type ScanMoviesResponseType,
  type QueueMoviesRequestType,
  MovieType,
} from "@/lib/types";
import { toast } from "sonner";
import { useState } from "react";
import client from "@/lib/hono";

export const KEYS = {
  MOVIE_LISTS: ["movieLists"],
  QUEUE_STATUS: ["queueStatus"],
  MOVIE_DETAIL: ["movieDetail"],
  MOVIE_PATH: ["moviePath"],
  MOVIE_INFO: ["movieInfo"],
  MOVIE_SUBTITLE_LISTS: ["movieSubtitleLists"],
  USER_LIBRARY: ["userLibrary"],
  MOVIE_PLAY: ["moviePlay"],
  MOVIE_REMUX: ["movieRemux"],
  MOVIE_REMUX_PROGRESS: ["movieRemuxProgress"],
  MOVIE_HLS: ["movieHls"],
  MOVIE_HLS_PROGRESS: ["movieHlsProgress"],
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
  }
  return { queueStatusQuery };
}
export function useMoviePath(tmdbId: string) {
  const moviePathQuery = useQuery({
    queryKey: [...KEYS.MOVIE_PATH, tmdbId],
    queryFn: async () => {
      const response = await client.api.movie.moviePath.$get({
        query: { tmdbId },
      });
      return response.json();
    },
  });

  return { moviePathQuery };
}

export function useMovieDetail(tmdbId: string) {
  const movieDetailQuery = useQuery({
    queryKey: [...KEYS.MOVIE_DETAIL, tmdbId],
    queryFn: async () => {
      const response = await client.api.movie.detail.$get({
        query: { tmdbId },
      });
      return response.json();
    },
  });
  return { movieDetailQuery };
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

export function useMovieRemux(moviePath: string, movieType?: MovieType) {
  const movieRemuxQuery = useQuery({
    queryKey: [...KEYS.MOVIE_REMUX, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.remux.$get({
        query: { moviePath },
      });
      return response.json();
    },
    enabled: movieType === "remux",
  });
  return { movieRemuxQuery };
}

export function useMovieRemuxProgress(jobId: string, moviePath: string) {
  const movieRemuxProgressQuery = useQuery({
    queryKey: [...KEYS.MOVIE_REMUX_PROGRESS, jobId],
    queryFn: async () => {
      const response = await client.api.movie.remuxProgress.$get({
        query: { jobId, moviePath },
      });
      return response.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.progress === 100 ? false : 1000;
    },
    enabled: !!jobId,
  });
  return { movieRemuxProgressQuery };
}

export function useMovieHls(moviePath: string, movieType?: MovieType) {
  const movieHlsQuery = useQuery({
    queryKey: [...KEYS.MOVIE_HLS, moviePath],
    queryFn: async () => {
      const response = await client.api.movie.hls.$get({
        query: { moviePath },
      });
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
