import type { AppType } from "@next-media/api";
import { hc } from "hono/client";
import { API_BASE_URL } from "@next-media/constants";

const client = hc<AppType>(API_BASE_URL, {
  init: {
    credentials: "include",
  },
});
export default client;
