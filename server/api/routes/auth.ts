import { auth } from "@/lib/auth";
import { Hono } from "hono";

export const authRoute = new Hono().on(["GET", "POST"], "*", (c) => {
  return auth.handler(c.req.raw);
});
