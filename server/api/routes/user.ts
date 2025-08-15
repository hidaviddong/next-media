import { HTTPException } from "hono/http-exception";
import type { Variables } from "../type";
import { Hono } from "hono";
import { db } from "@/server/drizzle";
import { library } from "@/server/drizzle/schema";
import { eq } from "drizzle-orm";

export const userRoute = new Hono<{ Variables: Variables }>()
  .use(async (c, next) => {
    const userId = c.get("user")?.id;
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    await next();
  })
  .get("/library", async (c) => {
    const userId = c.get("user")?.id;
    const userLibrary = await db.query.library.findFirst({
      where: eq(library.userId, userId!),
    });
    return c.json({ userLibrary });
  });
