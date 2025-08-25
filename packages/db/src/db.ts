import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { and, eq, desc } from "drizzle-orm";
import { movie, library, library_movies } from "./schema";
import { nanoid } from "nanoid";
import type { TmdbMovieResponse } from "@next-media/types";

export const db = drizzle(process.env.DB_FILE_NAME!, {
  schema: { movie, library, library_movies },
});

export function getMoviesByUserId(userId: string) {
  return db
    .select({
      movie: movie,
      path: library_movies.path,
    })
    .from(library)
    .where(eq(library.userId, userId))
    .innerJoin(library_movies, eq(library.id, library_movies.libraryId))
    .innerJoin(movie, eq(library_movies.movieId, movie.id))
    .orderBy(desc(movie.createdAt));
}

export function getLibrary(userId: string, libraryPath: string) {
  return db.query.library.findFirst({
    where: and(eq(library.path, libraryPath), eq(library.userId, userId)),
  });
}

export function getMovieByTmdbId(tmdbId: number) {
  return db.query.movie.findFirst({
    where: eq(movie.tmdbId, tmdbId),
  });
}

export function createLibrary(userId: string, libraryPath: string) {
  return db
    .insert(library)
    .values({ id: nanoid(), userId, path: libraryPath })
    .returning();
}

export function createMovie(tmdbResult: TmdbMovieResponse) {
  return db
    .insert(movie)
    .values({
      id: nanoid(),
      tmdbId: tmdbResult.id,
      name: tmdbResult.title,
      overview: tmdbResult.overview,
      year: tmdbResult.release_date,
      poster: tmdbResult.poster_path,
    })
    .returning();
}

export function createLibraryMovie(
  libraryId: string,
  movieId: string,
  path: string
) {
  return db.insert(library_movies).values({
    libraryId,
    movieId,
    path,
  });
}

export function getLibraryMovieByLibraryIdAndMovieId(
  libraryId: string,
  movieId: string
) {
  return db.query.library_movies.findFirst({
    where: and(
      eq(library_movies.libraryId, libraryId),
      eq(library_movies.movieId, movieId)
    ),
  });
}

export function getLibraryMovies(libraryId: string) {
  return db.query.library_movies.findMany({
    where: eq(library_movies.libraryId, libraryId),
  });
}

export function getLibraryMoviesByLibraryId(libraryId: string) {
  return db
    .select({ path: library_movies.path })
    .from(library_movies)
    .where(eq(library_movies.libraryId, libraryId));
}

export function getMoviePathByTmdbIdAndUserId(tmdbId: string, userId: string) {
  return db
    .select({
      path: library_movies.path,
    })
    .from(library_movies)
    .innerJoin(library, eq(library_movies.libraryId, library.id))
    .innerJoin(movie, eq(library_movies.movieId, movie.id))
    .where(and(eq(library.userId, userId), eq(movie.tmdbId, parseInt(tmdbId))));
}

export function getUserMovieAccess(userId: string, moviePath: string) {
  return db
    .select({
      path: library_movies.path,
    })
    .from(library_movies)
    .innerJoin(library, eq(library_movies.libraryId, library.id))
    .where(
      and(eq(library.userId, userId!), eq(library_movies.path, moviePath!))
    );
}
