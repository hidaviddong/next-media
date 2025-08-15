"use client";

import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { toast } from "sonner";
import MovieInfo from "./movie-info";
import { useMovieSubtitleLists } from "../hooks";
import { useRef } from "react";
import { SubtitleListsResponseType } from "@/lib/types";

export default function MoviePlayer({
  moviePath,
  posterPath,
}: {
  moviePath: string;
  posterPath: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { movieSubtitleListsQuery } = useMovieSubtitleLists(moviePath);

  const { data: movieSubtitleLists } = movieSubtitleListsQuery;

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
          src={`/api/movie/play/?moviePath=${encodeURIComponent(moviePath)}`}
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
          {/* <track
            kind="subtitles"
            srcLang="en"
            label="English"
            default
            src={`/api/movie/subtitles?moviePath=${encodeURIComponent(
              moviePath
            )}`}
          /> */}
        </video>
      </div>

      <MovieInfo moviePath={moviePath} />
    </div>
  );
}
