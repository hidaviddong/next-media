import z from "zod";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import fs from "fs/promises";
import { parseMovieFolder } from "../utils.js";
import type { Variables } from "../types.js";

const scanSchema = z.object({
  libraryPath: z.string(),
});

export const scanRoute = new Hono<{ Variables: Variables }>().post(
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
