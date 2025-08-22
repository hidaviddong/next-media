import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { and, eq, desc } from "drizzle-orm";
import * as schema from "./schema.js";
import { nanoid } from "nanoid";
import type { TmdbMovieResponse } from "@next-media/types";

export const db = drizzle(process.env.DB_FILE_NAME!, { schema });

export function getMoviesByUserId(userId: string) {
  return db
    .select({
      movie: schema.movie,
      path: schema.library_movies.path,
    })
    .from(schema.library)
    .where(eq(schema.library.userId, userId))
    .innerJoin(
      schema.library_movies,
      eq(schema.library.id, schema.library_movies.libraryId)
    )
    .innerJoin(schema.movie, eq(schema.library_movies.movieId, schema.movie.id))
    .orderBy(desc(schema.movie.createdAt));
}

export function getLibrary(userId: string, libraryPath: string) {
  return db.query.library.findFirst({
    where: and(
      eq(schema.library.path, libraryPath),
      eq(schema.library.userId, userId)
    ),
  });
}

export function getMovieByTmdbId(tmdbId: number) {
  return db.query.movie.findFirst({
    where: eq(schema.movie.tmdbId, tmdbId),
  });
}

export function createLibrary(userId: string, libraryPath: string) {
  return db
    .insert(schema.library)
    .values({ id: nanoid(), userId, path: libraryPath })
    .returning();
}

export function createMovie(tmdbResult: TmdbMovieResponse) {
  return db
    .insert(schema.movie)
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
  return db.insert(schema.library_movies).values({
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
      eq(schema.library_movies.libraryId, libraryId),
      eq(schema.library_movies.movieId, movieId)
    ),
  });
}

export function getLibraryMovies(libraryId: string) {
  return db.query.library_movies.findMany({
    where: eq(schema.library_movies.libraryId, libraryId),
  });
}

export function getLibraryMoviesByLibraryId(libraryId: string) {
  return db
    .select({ path: schema.library_movies.path })
    .from(schema.library_movies)
    .where(eq(schema.library_movies.libraryId, libraryId));
}

export function getMoviePathByTmdbIdAndUserId(tmdbId: string, userId: string) {
  return db
    .select({
      path: schema.library_movies.path,
    })
    .from(schema.library_movies)
    .innerJoin(
      schema.library,
      eq(schema.library_movies.libraryId, schema.library.id)
    )
    .innerJoin(schema.movie, eq(schema.library_movies.movieId, schema.movie.id))
    .where(
      and(
        eq(schema.library.userId, userId),
        eq(schema.movie.tmdbId, parseInt(tmdbId))
      )
    );
}

export function getUserMovieAccess(userId: string, moviePath: string) {
  return db
    .select({
      path: schema.library_movies.path,
    })
    .from(schema.library_movies)
    .innerJoin(
      schema.library,
      eq(schema.library_movies.libraryId, schema.library.id)
    )
    .where(
      and(
        eq(schema.library.userId, userId!),
        eq(schema.library_movies.path, moviePath!)
      )
    );
}
