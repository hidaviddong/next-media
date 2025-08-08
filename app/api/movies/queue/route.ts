import { tmdbApiRequestQueue } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { type ScanMoviesRequest } from "../scan/route";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { movies } = (await req.json()) as { movies: ScanMoviesRequest[] };
  try {
    tmdbApiRequestQueue.addBulk(
      movies.map((movie) => ({
        name: "tmdb-api-request",
        data: {
          ...movie,
          userId: session?.user.id,
        },
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
