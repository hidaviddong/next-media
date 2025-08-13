import Link from "next/link";
import Image from "next/image";
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
      <div className="group block">
        <AspectRatio
          ratio={2 / 3} // 电影海报经典的 2:3 宽高比
          className="flex items-center justify-center rounded-lg bg-neutral-800"
        >
          <span className="text-sm text-neutral-400">No Image</span>
        </AspectRatio>
        <h3 className="mt-2 text-sm font-medium text-neutral-300 truncate">
          {movie.name}
        </h3>
      </div>
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
      <div className="overflow-hidden rounded-lg">
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
      </div>
      <h3 className="text-sm text-center font-medium text-neutral-700 truncate pt-1">
        {movie.name}
      </h3>
    </Link>
  );
}
