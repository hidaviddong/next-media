import { Link } from "@tanstack/react-router";
import { AspectRatio } from "@next-media/ui/aspect-ratio.tsx";
import { TMDB_IMAGE_BASE_URL } from "@next-media/configs/constant";
import type { MovieListsResponseType } from "@/utils";
import { Check, MoreVertical, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@next-media/ui/dropdown-menu.tsx";
import { useMovieWatched } from "@/utils";

interface MovieCardProps {
  movie: MovieListsResponseType[number];
}

export function MovieCard(props: MovieCardProps) {
  const { movieWatchedMutation } = useMovieWatched();

  const movie = props.movie.movie;

  return (
    <Link
      to={"/movies/$movieId"}
      params={{ movieId: movie.tmdbId.toString() }}
      className="group block space-y-2"
    >
      <div className="overflow-hidden rounded-lg relative">
        <AspectRatio ratio={2 / 3} className="bg-neutral-800">
          <img
            src={`${TMDB_IMAGE_BASE_URL}${movie.poster}`}
            alt={`Poster for ${movie.name}`}
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
      </div>
      <h3 className="text-sm text-center font-medium text-neutral-700 truncate pt-1">
        {movie.name}
      </h3>
    </Link>
  );
}
