import { db } from "@/server/drizzle";
import { movie } from "@/server/drizzle/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
export async function GET() {
  try {
    const movies = await db.query.movie.findMany({
      orderBy: [desc(movie.createdAt)],
    });
    return NextResponse.json(movies);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
