import { db } from "@/lib/drizzle";
import { desc } from "drizzle-orm";
import { movie } from "@/lib/drizzle/schema";
import { MovieCard } from "./movie-card";

export async function MovieList() {
  const movies = await db.query.movie.findMany({
    orderBy: [desc(movie.createdAt)],
  });

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h3 className="text-lg font-semibold text-neutral-800">
          No Movies Found
        </h3>
        <p className="text-neutral-500">
          Your library is empty. Add a path to start scanning.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
