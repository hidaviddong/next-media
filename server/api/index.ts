import { Hono } from "hono";
import { logger } from "hono/logger";
import { customLogger, authMiddleware } from "./middleware";
import { authRoute, scanRoute, movieRoute } from "./routes";
import { Variables } from "./type";

const app = new Hono<{ Variables: Variables }>().basePath("/api");
const routes = app
  .use(logger(customLogger))
  .use("*", authMiddleware)
  .route("/auth", authRoute)
  .route("/scan", scanRoute)
  .route("/movie", movieRoute);

export default app;
export type AppType = typeof routes;
