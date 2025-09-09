import type { AppType } from "../server/api";
import { hc } from "hono/client";
import { API_BASE_URL } from "@next-media/configs/constant";

const client = hc<AppType>(APP_BASE_URL);
export default client;
