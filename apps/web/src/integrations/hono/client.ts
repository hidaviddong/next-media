import type { AppType } from "@next-media/api/client";
import { API_BASE_URL } from "@next-media/configs/constant";
import { hc } from "hono/client";

export const client = hc<AppType>(API_BASE_URL, {
  init: {
    credentials: "include",
  },
});
