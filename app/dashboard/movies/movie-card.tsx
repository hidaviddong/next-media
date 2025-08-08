import Link from "next/link";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { movie } from "@/lib/drizzle/schema";
import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";

type Movie = typeof movie.$inferSelect;

export function MovieCard({ movie }: { movie: Movie }) {
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
      href={`/dashboard/movies/${movie.id}`}
      className="group block space-y-2"
    >
      <div className="overflow-hidden rounded-lg">
        <AspectRatio ratio={2 / 3} className="bg-neutral-800">
          <Image
            src={posterUrl}
            alt={`Poster for ${movie.name}`}
            fill
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
