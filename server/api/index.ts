import { Hono } from "hono";
import { logger } from "hono/logger";
import authMiddleware from "./middleware/auth";
import authRoute from "./routes/auth";
import scanRoute from "./routes/scan";
import moviesRoute from "./routes/movies";
import { Variables } from "./type";

const app = new Hono<{ Variables: Variables }>().basePath("/api");

app.use(logger());
app.use("*", authMiddleware);
app.route("/auth", authRoute);
app.route("/scan", scanRoute);
app.route("/movies", moviesRoute);

export default app;
export type AppType = typeof app;
