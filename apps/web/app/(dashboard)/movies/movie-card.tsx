import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { AspectRatio } from "@next-media/ui/aspect-ratio.tsx";
import { TMDB_IMAGE_BASE_URL } from "@next-media/configs/constant";
import type { MovieListsResponseType } from "../../../lib/types";
import { Check, MoreVertical, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@next-media/ui/dropdown-menu.tsx";
import { useMovieWatched } from "./hooks";

interface MovieCardProps {
  movie: MovieListsResponseType[number];
}

export function MovieCard(props: MovieCardProps) {
  const { movieWatchedMutation } = useMovieWatched();

  const movie = props.movie.movie;

  return (
    <Link href={`/movies/${movie.tmdbId}`} className="group block space-y-2">
      <motion.div
        className="overflow-hidden rounded-lg relative"
        layoutId={`movie-${movie.tmdbId}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AspectRatio ratio={2 / 3} className="bg-neutral-800">
          <Image
            priority={true}
            src={`${TMDB_IMAGE_BASE_URL}${movie.poster}`}
            alt={`Poster for ${movie.name}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          />
        </AspectRatio>
        {props.movie.isWatched && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white z-10">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                movieWatchedMutation.mutate({
                  movieId: movie.id,
                  libraryId: props.movie.libraryId,
                  isWatched: !props.movie.isWatched,
                });
              }}
            >
              {props.movie.isWatched ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Mark as unwatched
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Mark as watched
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
      <motion.h3
        className="text-sm text-center font-medium text-neutral-700 truncate pt-1"
        layoutId={`title-${movie.tmdbId}`}
      >
        {movie.name}
      </motion.h3>
    </Link>
  );
}
