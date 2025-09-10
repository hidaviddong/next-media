import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Variables } from "../type.js";

export const checkUser = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const userId = c.get("user")?.id;
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    await next();
  }
);
