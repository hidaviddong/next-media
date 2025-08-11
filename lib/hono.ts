import type { AppType } from "@/server/api";
import { hc } from "hono/client";
import { APP_BASE_URL } from "./constant";

const client = hc<AppType>(APP_BASE_URL);
export default client;
