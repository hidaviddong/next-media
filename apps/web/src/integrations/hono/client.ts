import type { AppType } from "@next-media/api/client";
import { API_BASE_URL } from "@next-media/configs/constant";
import { hc } from "hono/client";

// In production, routes already include /api from server basePath, so use blank base
const BASE_URL = import.meta.env.PROD ? "" : API_BASE_URL;

export const client = hc<AppType>(BASE_URL, {
  init: {
    credentials: "include",
  },
});
