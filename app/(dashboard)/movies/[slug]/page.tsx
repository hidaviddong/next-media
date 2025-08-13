import { db } from "@/server/drizzle";
import { movie } from "@/server/drizzle/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { MovieDetail } from "./movie-detail";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ path: string }>;
}) {
  const { slug: tmdbId } = await params;
  const { path } = await searchParams;

  const movieRecord = await db.query.movie.findFirst({
    where: eq(movie.tmdbId, Number(tmdbId)),
  });

  if (!movieRecord) {
    return notFound();
  }

  const posterUrl = movieRecord.poster
    ? `${TMDB_IMAGE_BASE_URL}${movieRecord.poster}`
    : "";

  return (
    <MovieDetail path={path} posterUrl={posterUrl} movieRecord={movieRecord} />
  );
}
