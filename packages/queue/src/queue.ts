import { Queue } from "bullmq";
import { connection } from "./connection.js";

export const tmdbApiRequestQueue = new Queue("tmdb-api-requests", {
  connection,
});

export const remuxToMp4Queue = new Queue("remux-to-mp4", {
  connection,
});

export const hlsQueue = new Queue("hls", {
  connection,
});
