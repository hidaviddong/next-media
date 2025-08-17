import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../redis";
import { hls, remuxToMp4, tmdbApiRequest } from "../utils";

export const tmdbApiRequestWorker = new Worker(
  "tmdb-api-requests",
  tmdbApiRequest,
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 5,
      duration: 2000,
    },
  }
);

tmdbApiRequestWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

tmdbApiRequestWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});

export const remuxToMp4Worker = new Worker("remux-to-mp4", remuxToMp4, {
  connection,
});

remuxToMp4Worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

remuxToMp4Worker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});

export const hlsWorker = new Worker("hls", hls, {
  connection,
});

hlsWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

hlsWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
