import { Hono } from "hono";
import type { Variables } from "../type.js";

export const healthRoute = new Hono<{ Variables: Variables }>().on(
  ["GET"],
  "/",
  (c) => {
    return c.json({ message: "OK" });
  }
);
