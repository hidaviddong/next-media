import { HTTPException } from "hono/http-exception";
import type { Variables } from "../types.js";
import { Hono } from "hono";
import { getLibraryMovies } from "@next-media/db/db";

export const userRoute = new Hono<{ Variables: Variables }>()
  .use(async (c, next) => {
    const userId = c.get("user")?.id;
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    await next();
  })
  .get("/library", async (c) => {
    const userId = c.get("user")!.id;
    const libraryMovies = await getLibraryMovies(userId);
    return c.json({ libraryMovies });
  });
