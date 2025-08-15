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
import { useEffect, useRef, useState } from "react";
import { SubtitleListsResponseType } from "@/lib/types";
import Hls from "hls.js";
import { getDirname } from "@/lib/utils";

export default function MoviePlayer({
  moviePath,
  posterPath,
}: {
  moviePath: string;
  posterPath: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [remuxJobId, setRemuxJobId] = useState("");
  const { movieInfoQuery } = useMovieInfo(moviePath);
  const movieType = movieInfoQuery.data?.type;
  const { movieSubtitleListsQuery } = useMovieSubtitleLists(moviePath);
  const { data: movieSubtitleLists } = movieSubtitleListsQuery;
  const { movieRemuxMutation } = useMovieRemux();
  const { movieRemuxProgressQuery } = useMovieRemuxProgress(remuxJobId);
  const remuxProgress = movieRemuxProgressQuery.data?.progress;
  useEffect(() => {
    if (videoRef.current && movieType) {
      switch (movieType) {
        case "direct":
          videoRef.current.src = `/api/movie/directPlay?moviePath=${encodeURIComponent(
            moviePath
          )}`;
          break;
        case "remux":
          movieRemuxMutation.mutate(
            { moviePath },
            {
              onSuccess(data) {
                if ("jobId" in data) {
                  setRemuxJobId(data.jobId);
                } else if ("cachedFilePath" in data) {
                  videoRef.current!.src = `/api/movie/directPlay?moviePath=${encodeURIComponent(
                    getDirname(data.cachedFilePath)
                  )}`;
                }
              },
            }
          );
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
      <p>{remuxProgress}</p>
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
