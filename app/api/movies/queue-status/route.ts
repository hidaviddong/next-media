import { tmdbApiRequestQueue } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const queueJobs = await tmdbApiRequestQueue.getJobs([
      "active",
      "waiting",
      "failed",
      "completed",
    ]);

    // 处理队列数据
    const queueStats = {
      active: queueJobs.filter(
        (job) => job.finishedOn === undefined && job.failedReason === undefined
      ).length,
      waiting: queueJobs.filter(
        (job) =>
          job.finishedOn === undefined &&
          job.failedReason === undefined &&
          job.processedOn === undefined
      ).length,
      failed: queueJobs.filter((job) => job.failedReason !== undefined).length,
      completed: queueJobs.filter(
        (job) => job.finishedOn !== undefined && job.failedReason === undefined
      ).length,
    };

    const queueDetails = {
      active: queueJobs
        .filter(
          (job) =>
            job.finishedOn === undefined && job.failedReason === undefined
        )
        .map((job) => ({
          id: job.id,
          name: job.data.name,
          year: job.data.year,
          progress: job.progress,
          timestamp: job.timestamp,
          path: job.data.path,
        })),
      waiting: queueJobs
        .filter(
          (job) =>
            job.finishedOn === undefined &&
            job.failedReason === undefined &&
            job.processedOn === undefined
        )
        .map((job) => ({
          id: job.id,
          name: job.data.name,
          year: job.data.year,
          timestamp: job.timestamp,
          path: job.data.path,
        })),
      failed: queueJobs
        .filter((job) => job.failedReason !== undefined)
        .map((job) => ({
          id: job.id,
          name: job.data.name,
          year: job.data.year,
          failedReason: job.failedReason,
          timestamp: job.timestamp,
          path: job.data.path,
        })),
      completed: queueJobs
        .filter(
          (job) =>
            job.finishedOn !== undefined && job.failedReason === undefined
        )
        .map((job) => ({
          id: job.id,
          name: job.data.name,
          year: job.data.year,
          timestamp: job.timestamp,
          path: job.data.path,
        })),
    };

    return NextResponse.json({
      stats: queueStats,
      details: queueDetails,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
