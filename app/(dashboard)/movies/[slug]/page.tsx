import { db } from "@next-media/db/index.ts";
import { movie } from "@next-media/db/schema.ts";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MovieDetail } from "./movie-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: tmdbId } = await params;

  const movieRecord = await db.query.movie.findFirst({
    where: eq(movie.tmdbId, Number(tmdbId)),
  });

  if (!movieRecord) {
    return notFound();
  }
  return <MovieDetail movieRecord={movieRecord} />;
}
