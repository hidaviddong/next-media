"use client";

import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { toast } from "sonner";
import MovieInfo from "./movie-info";

export default function MoviePlayer({
  moviePath,
  posterPath,
}: {
  moviePath: string;
  posterPath: string;
}) {
  return (
    <div className="w-full mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          controls
          src={`/api/movie/play/?moviePath=${moviePath}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            toast.error(e.currentTarget.error?.message);
          }}
          poster={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <MovieInfo moviePath={moviePath} />
    </div>
  );
}
