import z from "zod";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import fs from "fs/promises";
import { parseMovieFolder } from "@next-media/worker/utils";
import type { Variables } from "../type";
import { checkUser } from "../middleware";
import { db } from "@next-media/db/db";
import { and, eq } from "drizzle-orm";
import { cache_item, library } from "@next-media/db/schema";
const scanSchema = z.object({
  libraryPath: z.string(),
});

const capacitySchema = z.object({
  libraryPath: z.string(),
});

interface ScanFolder {
  folderName: string;
  name: string;
  year: string;
}

export const scanRoute = new Hono<{ Variables: Variables }>()
  .use(checkUser)
  .post(
    "/",
    zValidator("json", scanSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const { libraryPath } = c.req.valid("json");
      const scanFolders: ScanFolder[] = [];
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
          year: parsed.year ?? "",
        });
      }
      return c.json({ data: scanFolders }, { status: 200 });
    }
  )
  .get(
    "/capacity",
    zValidator("query", capacitySchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, { message: "Invalid Request" });
      }
    }),
    async (c) => {
      const userId = c.get("user")?.id;
      const { libraryPath } = c.req.valid("query");

      const userLibrary = await db.query.library.findFirst({
        where: and(eq(library.userId, userId!), eq(library.path, libraryPath)),
      });

      if (!userLibrary) {
        throw new HTTPException(404, { message: "Library not found" });
      }

      const cacheItems = await db.query.cache_item.findMany({
        where: eq(cache_item.libraryId, userLibrary.id),
      });

      const checkCacheCapacity = cacheItems.reduce(
        (acc, item) => acc + item.bytes,
        0
      );

      const userLibraryCapacity = userLibrary.maxCacheBytes ?? 0;

      return c.json({
        capacity:
          checkCacheCapacity >= userLibraryCapacity
            ? 100
            : ((checkCacheCapacity / userLibraryCapacity) * 100).toFixed(1),
        checkCacheCapacity: (checkCacheCapacity / 1024 / 1024 / 1024).toFixed(
          1
        ),
        userLibraryCapacity: (userLibraryCapacity / 1024 / 1024 / 1024).toFixed(
          1
        ),
      });
    }
  );
