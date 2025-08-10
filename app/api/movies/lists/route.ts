import { db } from "@/lib/drizzle";
import { movie } from "@/lib/drizzle/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  const movies = await db.query.movie.findMany({
    orderBy: [desc(movie.createdAt)],
  });
  return NextResponse.json(movies);
}
