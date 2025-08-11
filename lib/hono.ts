import type { AppType } from "@/server/api";
import { hc } from "hono/client";

const client = hc<AppType>("http://localhost:3000/");
export default client;
