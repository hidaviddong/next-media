"use client";

import { MovieDetail } from "./movie-detail";
import { notFound, useParams } from "next/navigation";
import { useMovieDetail } from "../hooks";

export default function Page() {
  const { slug: tmdbId } = useParams();

  const { movieDetailQuery } = useMovieDetail(tmdbId as string);

  if (!movieDetailQuery.data) {
    return notFound();
  }

  return <MovieDetail {...movieDetailQuery.data} />;
}
