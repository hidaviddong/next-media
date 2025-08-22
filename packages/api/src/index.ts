import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { customLogger, authMiddleware } from "./middleware/index.js";
import { authRoute, scanRoute, movieRoute, userRoute } from "./routes/index.js";
import type { Variables } from "./types.js";
import { cors } from "hono/cors";

const app = new Hono<{ Variables: Variables }>().basePath("/api");
const routes = app
  .use(cors())
  .use(logger(customLogger))
  .use("*", authMiddleware)
  .route("/auth", authRoute)
  .route("/scan", scanRoute)
  .route("/user", userRoute)
  .route("/movie", movieRoute);

serve({
  fetch: app.fetch,
  port: 3001,
});

export type AppType = typeof routes;
