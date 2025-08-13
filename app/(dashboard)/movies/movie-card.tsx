import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import type { MovieListsResponseType } from "@/lib/types";

interface MovieCardProps {
  movie: MovieListsResponseType[number];
}

export function MovieCard(props: MovieCardProps) {
  const movie = props.movie.movie;

  if (!movie.poster) {
    return (
      <motion.div
        className="group block"
        layoutId={`movie-${movie.tmdbId}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <AspectRatio
          ratio={2 / 3}
          className="flex items-center justify-center rounded-lg bg-neutral-800"
        >
          <span className="text-sm text-neutral-400">No Image</span>
        </AspectRatio>
        <motion.h3
          className="mt-2 text-sm font-medium text-neutral-300 truncate"
          layoutId={`title-${movie.tmdbId}`}
        >
          {movie.name}
        </motion.h3>
      </motion.div>
    );
  }

  const posterUrl = `${TMDB_IMAGE_BASE_URL}${movie.poster}`;

  return (
    <Link
      href={{
        pathname: `/movies/${movie.tmdbId}`,
        query: { path: props.movie.path },
      }}
      className="group block space-y-2"
    >
      <motion.div
        className="overflow-hidden rounded-lg"
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
            src={posterUrl}
            alt={`Poster for ${movie.name}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          />
        </AspectRatio>
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
