import { auth } from "@next-media/auth/server";
import { Hono } from "hono";
import type { Variables } from "../type.js";

export const authRoute = new Hono<{ Variables: Variables }>().on(
  ["GET", "POST"],
  "*",
  (c) => {
    return auth.handler(c.req.raw);
  }
);
