import { and, asc, eq, sum } from "drizzle-orm";
import { db } from "@next-media/db/db";
import { cache_item, library } from "@next-media/db/schema";
import { nanoid } from "nanoid";
import { hlsQueue, remuxToMp4Queue } from ".";
import path from "node:path";
import fs from "node:fs/promises";

interface EnsureCacheSpaceParams {
  userId: string;
  libraryId: string;
  estimatedCacheSize: number;
}
const MAX_DELETE_COUNT = 10;

async function deleteCacheTwoLevelsUp(filePath: string) {
  try {
    const parentDir = path.dirname(filePath);
    const targetDir = path.dirname(parentDir);

    if (path.basename(targetDir) === ".cache") {
      await fs.rm(targetDir, { recursive: true, force: true });
      console.log("成功删除 .cache 目录及其所有内容。");
    } else {
      console.log(`路径 "${targetDir}" 不是一个 .cache 目录，已取消删除操作。`);
    }

    if (path.basename(parentDir) === ".cache") {
      await fs.rm(parentDir, { recursive: true, force: true });
      console.log("成功删除 .cache 目录及其所有内容。");
    } else {
      console.log(`路径 "${parentDir}" 不是一个 .cache 目录，已取消删除操作。`);
    }
  } catch (e) {
    throw e;
  }
}

export async function ensureCacheSpace({
  userId,
  libraryId,
  estimatedCacheSize,
}: EnsureCacheSpaceParams) {
  const lib = await db.query.library.findFirst({
    where: eq(library.id, libraryId),
  });
  if (!lib) {
    throw new Error("Library not found");
  }
  const maxCacheBytes = lib.maxCacheBytes ?? 0;

  const result = await db
    .select({ total: sum(cache_item.bytes) })
    .from(cache_item)
    .where(
      and(eq(cache_item.libraryId, libraryId), eq(cache_item.userId, userId))
    );

  // 获取当前缓存文件夹中的所有缓存文件大小
  let currentCacheSize = Number(result[0].total);
  let deleteCount = 0;

  while (
    currentCacheSize + estimatedCacheSize > maxCacheBytes &&
    deleteCount < MAX_DELETE_COUNT
  ) {
    console.log("LRU 空间不足，开始删除缓存");
    const oldCacheItem = await db.query.cache_item.findFirst({
      where: and(
        eq(cache_item.libraryId, libraryId),
        eq(cache_item.userId, userId)
      ),
      orderBy: asc(cache_item.lastAccessedAt),
    });

    if (!oldCacheItem) {
      console.log("缓存已满但是找不到cache_item");
      break;
    }
    deleteCount++;

    const oldCacheItemJobId = Buffer.from(oldCacheItem.inputPath).toString(
      "base64url"
    );
    await deleteCacheTwoLevelsUp(oldCacheItem.outputPath);
    const remuxToMp4job = await remuxToMp4Queue.getJob(oldCacheItemJobId);
    const hlsJob = await hlsQueue.getJob(oldCacheItemJobId);
    if (remuxToMp4job) {
      console.log("删除remuxToMp4job", oldCacheItemJobId);
      await remuxToMp4job.remove();
    }
    if (hlsJob) {
      console.log("删除hlsJob", oldCacheItemJobId);
      await hlsJob.remove();
    }
    await db
      .delete(cache_item)
      .where(
        and(eq(cache_item.id, oldCacheItem.id), eq(cache_item.userId, userId))
      );
    currentCacheSize -= oldCacheItem.bytes;
    console.log(
      `删除缓存 ${oldCacheItem.outputPath} 成功，当前缓存大小: ${currentCacheSize}`
    );
  }

  return deleteCount;
}

interface AddCacheItemParams {
  libraryId: string;
  userId: string;
  movieId: string; // tmdbId
  inputPath: string; // 原始电影在硬盘中的实际存储地址
  outputPath: string; // 转码后的电影在硬盘中的实际存储地址
  bytes: number; // 电影文件大小
}

export async function addCacheItem({
  libraryId,
  userId,
  movieId,
  inputPath,
  outputPath,
  bytes,
}: AddCacheItemParams) {
  console.log("LRU添加新的缓存记录", path);
  await db.insert(cache_item).values({
    id: nanoid(),
    libraryId,
    userId,
    movieId,
    inputPath,
    outputPath,
    bytes,
  });
}

interface UpdateCacheItemParams {
  libraryId: string;
  userId: string;
  movieId: string;
}

export async function updateCacheItem({
  libraryId,
  userId,
  movieId,
}: UpdateCacheItemParams) {
  console.log(`[LRU] 更新访问时间，电影: ${movieId}`);
  await db
    .update(cache_item)
    .set({ lastAccessedAt: new Date() })
    .where(
      and(
        eq(cache_item.movieId, movieId),
        eq(cache_item.libraryId, libraryId),
        eq(cache_item.userId, userId)
      )
    );
}
