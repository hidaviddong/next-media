import z from "zod";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import fs from "fs/promises";

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

export const scanRoute = new Hono().post(
  "/",
  zValidator("json", scanSchema, (result, c) => {
    if (!result.success) {
      throw new HTTPException(400, { message: "Invalid Request" });
    }
  }),
  async (c) => {
    const { libraryPath } = c.req.valid("json");
    const scanFolders = [];
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
