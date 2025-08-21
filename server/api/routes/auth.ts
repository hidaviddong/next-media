import { auth } from "@/lib/auth";
import { Hono } from "hono";
import type { Variables } from "../type";

export const authRoute = new Hono<{ Variables: Variables }>().on(
  ["GET", "POST"],
  "*",
  (c) => {
    return auth.handler(c.req.raw);
  }
);
