import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

function parseMovieFolder(folder: string) {
  let name = folder.trim();
  if (!name) return null;
  let year: string | undefined = undefined;
  const nameMatch = name.match(/^(.*?)\s*\((\d{4})\)$/);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1];
    year = nameMatch[2];
  }
  return { name, year };
}

export async function POST(req: NextRequest) {
  try {
    const scanFolders = [];
    const { folderPath } = await req.json();
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const movieFoldersList = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const movieFolder of movieFoldersList) {
      const parsed = parseMovieFolder(movieFolder);
      if (!parsed) continue;
      scanFolders.push({
        path: path.join(folderPath, movieFolder),
        name: parsed.name,
        year: parsed.year,
      });
    }
    return NextResponse.json({ data: scanFolders }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
