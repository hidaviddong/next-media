"use client";

import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { toast } from "sonner";
import MovieInfo from "./movie-info";
import { useMovieInfo, useMovieSubtitleLists } from "../hooks";
import { useEffect, useRef } from "react";
import { SubtitleListsResponseType } from "@/lib/types";
import Hls from "hls.js";

export default function MoviePlayer({
  moviePath,
  posterPath,
}: {
  moviePath: string;
  posterPath: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { movieInfoQuery } = useMovieInfo(moviePath);
  const movieType = movieInfoQuery.data?.type;
  const { movieSubtitleListsQuery } = useMovieSubtitleLists(moviePath);
  const { data: movieSubtitleLists } = movieSubtitleListsQuery;

  useEffect(() => {
    // 确保只初始化一次 Hls
    if (videoRef.current && movieType) {
      switch (movieType) {
        case "direct":
          videoRef.current.src = `/api/movie/directPlay?moviePath=${encodeURIComponent(
            moviePath
          )}`;
          break;
        case "remux":
          // TODO
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
  }, [moviePath, videoRef, movieType]);

  const getSubtitleSrc = (track: SubtitleListsResponseType[number]) => {
    const params = new URLSearchParams({ moviePath });
    if (track.type === "embedded") {
      params.set("index", track.index!.toString());
    } else {
      params.set("externalPath", track.path!);
    }
    return `/api/movie/subtitle?${params.toString()}`;
  };

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
                src={getSubtitleSrc(track)}
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
