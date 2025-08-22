import { Hono } from "hono";
import type { Variables } from "../types.js";
import { auth } from "../auth.js";

export const authRoute = new Hono<{ Variables: Variables }>().on(
  ["GET", "POST"],
  "*",
  (c) => {
    return auth.handler(c.req.raw);
  }
);
