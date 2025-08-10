"use client";

import { MovieCard } from "./movie-card";
import { useQuery } from "@tanstack/react-query";
import { movie } from "@/server/drizzle/schema";

type Movie = typeof movie.$inferSelect;

export default function MovieList() {
  const { data: movies } = useQuery<Movie[]>({
    queryKey: ["movies-lists"],
    queryFn: async () => {
      const response = await fetch("/api/movies/lists");
      if (!response.ok) {
        throw new Error("Failed to fetch queue status");
      }
      return response.json();
    },
  });

  if (!movies) {
    return <></>;
  }

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
