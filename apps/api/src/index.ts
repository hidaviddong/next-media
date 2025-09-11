import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { customLogger, authMiddleware } from "./middleware/index.js";
import { WEB_BASE_URL, API_PORT } from "@next-media/configs/constant";
import {
  authRoute,
  scanRoute,
  movieRoute,
  chatRoute,
  userRoute,
} from "./routes/index.js";
import type { Variables } from "./type.js";

const app = new Hono<{ Variables: Variables }>().basePath("/api");

export const routes = app
  .get("/health", (c) => c.json({ message: "OK" }))
  .use(
    cors({
      origin: WEB_BASE_URL,
      credentials: true,
    })
  )
  .use(logger(customLogger))
  .use("*", authMiddleware)
  .route("/auth", authRoute)
  .route("/scan", scanRoute)
  .route("/user", userRoute)
  .route("/movie", movieRoute)
  .route("/chat", chatRoute);

serve(
  {
    fetch: app.fetch,
    port: API_PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

export default app;
