import "dotenv/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisConfig = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!, 10),
  maxRetriesPerRequest: null,
};

export const connection = new IORedis(redisConfig);

export const tmdbApiRequestQueue = new Queue("tmdb-api-requests", {
  connection,
});

export const remuxToMp4Queue = new Queue("remux-to-mp4", {
  connection,
});
