import { tmdbApiRequestQueue } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { type Movie } from "@/app/dashboard/movies/add-folder-dialog";
export async function POST(req: NextRequest) {
  const { movies } = await req.json();
  console.log("movies is", movies);
  try {
    tmdbApiRequestQueue.addBulk(
      movies.map((movie: Movie) => ({
        name: "tmdb-api-request",
        data: movie,
      }))
    );
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
