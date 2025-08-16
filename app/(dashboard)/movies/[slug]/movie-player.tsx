"use client";

import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { toast } from "sonner";
import MovieInfo from "./movie-info";
import {
  useMovieInfo,
  useMovieRemux,
  useMovieSubtitleLists,
  useMovieRemuxProgress,
} from "../hooks";
import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { getDirname, getSubtitleSrc } from "@/lib/utils";
import { MovieProgress } from "./movie-progress";

export default function MoviePlayer({
  moviePath,
  posterPath,
}: {
  moviePath: string;
  posterPath: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // movie info
  const { movieInfoQuery } = useMovieInfo(moviePath);
  const movieType = movieInfoQuery.data?.type;
  // subtitls
  const { movieSubtitleListsQuery } = useMovieSubtitleLists(moviePath);
  const movieSubtitleLists = movieSubtitleListsQuery.data;
  // remux
  const { movieRemuxQuery } = useMovieRemux(moviePath, movieType);
  const remuxJobId = movieRemuxQuery.data?.jobId;
  const { movieRemuxProgressQuery } = useMovieRemuxProgress(
    remuxJobId,
    moviePath
  );
  const remuxProgress = movieRemuxProgressQuery.data?.progress;
  const outputPath = movieRemuxQuery.data?.outputPath;

  useEffect(() => {
    if (videoRef.current && movieType) {
      switch (movieType) {
        case "direct":
          videoRef.current.src = `/api/movie/directPlay?moviePath=${encodeURIComponent(
            moviePath
          )}`;
          break;
        case "remux":
          if (remuxProgress === 100) {
            videoRef.current.src = `/api/movie/directPlay?moviePath=${encodeURIComponent(
              getDirname(outputPath)
            )}`;
          }
          break;
        case "hls":
          if (Hls.isSupported()) {
            // const hls = new Hls();
            // const hlsSource = `/api/movie/playHls/output.m3u8?moviePath=${encodeURIComponent(
            //   moviePath
            // )}`;
            // hls.loadSource(hlsSource);
            // hls.attachMedia(videoRef.current);
          }
          // TODO
          break;
      }
    }
  }, [moviePath, videoRef, movieType, remuxProgress, outputPath]);

  if (remuxProgress < 100) {
    return (
      <MovieProgress
        progress={remuxProgress}
        poster={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
      />
    );
  }

  return (
    <div className="w-full mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          controls
          className="w-full h-full object-contain"
          onError={(e) => {
            toast.error(e.currentTarget.error?.message);
          }}
          poster={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
        >
          {movieSubtitleLists &&
            movieSubtitleLists.map((track, i) => (
              <track
                key={
                  track.type === "embedded"
                    ? `embed-${track.index}`
                    : `ext-${track.path}`
                }
                src={getSubtitleSrc(moviePath, track)}
                kind="subtitles"
                srcLang={track.lang || "und"}
                label={track.title || `Subtitle ${i + 1}`}
                default={i === 0}
              />
            ))}
          Your browser does not support the video tag.
        </video>
      </div>

      <MovieInfo moviePath={moviePath} />
    </div>
  );
}
