import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { customLogger, authMiddleware } from "./middleware/index.js";
import { authRoute, scanRoute, movieRoute, userRoute } from "./routes/index.js";
import type { Variables } from "./types.js";
import { cors } from "hono/cors";
import { APP_BASE_URL } from "@next-media/constants";

const app = new Hono<{ Variables: Variables }>().basePath("/api");

const routes = app
  .use("/foo", async (c) => c.text("bar"))
  .use(
    "*",
    cors({
      origin: APP_BASE_URL,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    })
  )
  .use(logger(customLogger))
  .use("*", authMiddleware)
  .route("/auth", authRoute)
  .route("/scan", scanRoute)
  .route("/user", userRoute)
  .route("/movie", movieRoute);

serve({
  fetch: app.fetch,
  port: parseInt(process.env.API_PORT!, 10),
});

export type AppType = typeof routes;
