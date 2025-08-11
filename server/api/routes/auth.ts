import { auth } from "@/lib/auth";
import { Hono } from "hono";

const app = new Hono().on(["GET", "POST"], "*", (c) => {
  return auth.handler(c.req.raw);
});

export default app;
