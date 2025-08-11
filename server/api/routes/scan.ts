import z from "zod";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import fs from "fs/promises";
import type { ScanMoviesResponse } from "@/lib/types";

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

const scanSchema = z.object({
  libraryPath: z.string(),
});

const app = new Hono().post(
  "/",
  zValidator("json", scanSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Invalid request" }, { status: 400 });
    }
  }),
  async (c) => {
    const { libraryPath } = c.req.valid("json");
    const scanFolders: ScanMoviesResponse["data"] = [];
    const entries = await fs.readdir(libraryPath, {
      withFileTypes: true,
    });
    const movieFoldersList = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const movieFolder of movieFoldersList) {
      const parsed = parseMovieFolder(movieFolder);
      if (!parsed) continue;
      scanFolders.push({
        folderName: movieFolder,
        name: parsed.name,
        year: parsed.year,
      });
    }
    return c.json({ data: scanFolders }, { status: 200 });
  }
);

export default app;
