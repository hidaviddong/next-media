import { handle } from "hono/vercel";
import app from "@/server/api";

export const GET = handle(app);
export const POST = handle(app);
