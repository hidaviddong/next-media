import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "@next-media/configs/env";

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
};

export const connection = new Redis(redisConfig);

export const tmdbApiRequestQueue = new Queue("tmdb-api-requests", {
  connection,
});

export const remuxToMp4Queue = new Queue("remux-to-mp4", {
  connection,
});

export const hlsQueue = new Queue("hls", {
  connection,
});
