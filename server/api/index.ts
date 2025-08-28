import { Hono } from "hono";
import { logger } from "hono/logger";
import { customLogger, authMiddleware } from "./middleware";
import { authRoute, scanRoute, movieRoute, chatRoute } from "./routes";
import { Variables } from "./type";
import { userRoute } from "./routes/user";

const app = new Hono<{ Variables: Variables }>().basePath("/api");
const routes = app
  .use(logger(customLogger))
  .use("*", authMiddleware)
  .route("/auth", authRoute)
  .route("/scan", scanRoute)
  .route("/user", userRoute)
  .route("/movie", movieRoute)
  .route("/chat", chatRoute);

export default app;
export type AppType = typeof routes;
