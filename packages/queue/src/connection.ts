import "dotenv/config";
import { Redis } from "ioredis";

export const connection = new Redis({
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!, 10),
  maxRetriesPerRequest: null,
});
