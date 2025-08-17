import { spawn } from "node:child_process";
import type { Job } from "bullmq";
import {
  HlsJob,
  RemuxToMp4Job,
  TmdbApiRequestJob,
  TmdbMovieResponse,
} from "@/lib/types";
import consola from "consola";
import { library, library_movies, movie } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../drizzle";
import { TMDB_BASE_URL } from "@/lib/constant";
import { nanoid } from "nanoid";
import path from "node:path";

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN!;

export interface MovieInfo {
  streams: Record<string, any>[];
  format: Record<string, any>;
}
export interface SubtitleTrackInfo {
  type: "embedded" | "external"; // 字幕来源：内封还是外部文件
  index?: number; // 如果是内封字幕，它的流索引
  lang?: string; // 语言代码 (e.g., "chi", "eng")
  title?: string; // 标题/描述 (e.g., "简体中文", "English SDH")
  path?: string; // 如果是外部文件，它的路径
}

function parseTimeToSeconds(timeString: string) {
  const parts = timeString.split(":");
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

export const remuxToMp4_mock = async (job: Job<RemuxToMp4Job>) => {
  const { inputPath, outputPath } = job.data;
  consola.info(`[Worker] 开始转码: ${inputPath}`);

  for (let i = 0; i <= 100; i++) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await job.updateProgress(i);
    consola.info(`[Worker] 进度: ${inputPath} - ${i}%`);
  }

  consola.info(`[Worker] 转码完成: ${inputPath}`);
  return { outputPath, status: "Completed" };
};

export const tmdbApiRequest = async (job: Job<TmdbApiRequestJob>) => {
  const { userId, libraryPath, filePath, movieTitle, year } = job.data;
  console.log(`Processing job ${job.id} for file: ${filePath}`);

  // =================================================================
  // 1. 获取 Library (逻辑不变)
  // =================================================================
  const lib = await db.query.library.findFirst({
    where: and(eq(library.path, libraryPath), eq(library.userId, userId)),
  });
  if (!lib) {
    throw new Error(
      `Library with path "${libraryPath}" not found for user ${userId}`
    );
  }

  // =================================================================
  // 2. 请求 TMDB API
  // =================================================================
  console.log(`Fetching TMDB data for: "${movieTitle}" (${year})`);
  const url = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
    movieTitle
  )}${year ? `&year=${year}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB API request failed`);
  }
  const data = await res.json();
  const tmdbResult = data.results?.[0] as TmdbMovieResponse;

  console.log("tmdbResult", tmdbResult);

  if (!tmdbResult) {
    throw new Error(`No movie found on TMDB for query: "${movieTitle}"`);
  }
  console.log(`Found TMDB ID: ${tmdbResult.id}.`);

  // =================================================================
  // 3. 查找或创建电影主数据
  //    确保电影元数据在 `movie` 表中是唯一的。
  // =================================================================

  let movieRecord = await db.query.movie.findFirst({
    where: eq(movie.tmdbId, tmdbResult.id),
  });

  if (!movieRecord) {
    const newMovies = await db
      .insert(movie)
      .values({
        id: nanoid(),
        tmdbId: tmdbResult.id,
        name: tmdbResult.title,
        overview: tmdbResult.overview,
        year: tmdbResult.release_date,
        poster: tmdbResult.poster_path,
      })
      .returning();
    movieRecord = newMovies[0];
  }

  const existingLink = await db.query.library_movies.findFirst({
    where: and(
      eq(library_movies.libraryId, lib.id),
      eq(library_movies.movieId, movieRecord.id)
    ),
  });

  if (existingLink) {
    console.log(
      `Movie "${movieRecord.name}" is already linked to library "${lib.path}". Skipping.`
    );
    return { message: "Movie already linked." };
  }

  await db.insert(library_movies).values({
    libraryId: lib.id,
    movieId: movieRecord.id,
    path: path.join(libraryPath, filePath),
  });

  console.log(
    `Successfully linked movie "${movieRecord.name}" from path "${filePath}" to library "${lib.path}".`
  );
  return { success: true };
};

export const remuxToMp4 = async (job: Job<RemuxToMp4Job>) => {
  const { inputPath, outputPath } = job.data;
  consola.info(`[Worker] 开始转码: ${inputPath}`);

  const movieInfo = await getMovieInfo(inputPath);
  const totalDurationString = movieInfo.format.duration;
  const totalDurationInSeconds = parseFloat(totalDurationString);

  const ffmpegArgs: string[] = [
    "-i",
    inputPath,
    "-c",
    "copy",
    "-sn",
    outputPath,
  ];

  try {
    await executeFFmpeg(ffmpegArgs, job, totalDurationInSeconds);
  } catch (e) {
    throw e;
  }
};

export const hls = async (job: Job<HlsJob>) => {
  const { inputPath, outputPath } = job.data;
  const tsFilename = path.join(outputPath, "segment%03d.ts");
  const m3u8Path = path.join(outputPath, "output.m3u8");
  consola.info(`[Worker] 开始转码为m3u8: ${inputPath}`);
  const movieInfo = await getMovieInfo(inputPath);
  const totalDurationString = movieInfo.format.duration;
  const totalDurationInSeconds = parseFloat(totalDurationString);

  const ffmpegArgs = [
    "-y",
    "-i",
    inputPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-sn",
    "-f",
    "hls",
    "-hls_time",
    "4",
    "-hls_list_size",
    "0",
    "-hls_segment_filename",
    tsFilename,
    m3u8Path,
  ];
  try {
    await executeFFmpeg(ffmpegArgs, job, totalDurationInSeconds);
  } catch (e) {
    throw e;
  }
};

function executeFFmpeg(
  ffmpegArgs: string[],
  job: Job,
  totalDurationInSeconds: number
) {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);
    let errorOutput = "";
    ffmpegProcess.stderr.on("data", async (data) => {
      const logLine = data.toString();
      errorOutput += logLine;
      // 使用正则表达式匹配 'time=' 字段
      const timeMatch = logLine.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);

      if (timeMatch && timeMatch[1]) {
        const currentTimeString = timeMatch[1];
        const currentTimeInSeconds = parseTimeToSeconds(currentTimeString);

        // 计算进度百分比
        if (totalDurationInSeconds > 0) {
          const progress = Math.round(
            (currentTimeInSeconds / totalDurationInSeconds) * 100
          );
          // 调用回调函数，并确保进度不超过 100
          await job.updateProgress(Math.min(100, progress));
        }
      }
    });

    ffmpegProcess.on("close", async (code) => {
      if (code === 0) {
        await job.updateProgress(100);
        resolve("");
      } else {
        consola.error("FFmpeg error output:", errorOutput);
        reject(new Error(`FFmpeg exited with code ${code}.`));
      }
    });

    ffmpegProcess.on("error", (err) => {
      consola.error("Failed to start FFmpeg process.", err);
      reject(err);
    });
  });
}

export function getMovieInfo(moviePath: string): Promise<MovieInfo> {
  return new Promise((resolve, reject) => {
    const ffprobeArgs = [
      "-v",
      "error", // 只输出严重错误，保持 stdout 干净
      "-show_format", // 获取容器格式信息（时长、码率等）
      "-show_streams", // 获取所有流的信息（视频、音频、字幕）
      "-of",
      "json", // 最重要的部分：指定输出为 JSON 格式
      moviePath, // 最后是目标文件路径
    ];
    const ffprobe = spawn("ffprobe", ffprobeArgs);

    let jsonData = "";
    let errorData = "";

    ffprobe.stdout.on("data", (data) => {
      jsonData += data.toString();
    });

    ffprobe.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    ffprobe.on("error", (err) => {
      consola.error("Failed to start ffprobe process.", err);
      reject(err);
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        if (!jsonData) {
          reject(new Error("ffprobe output was empty."));
          return;
        }
        try {
          const parsedData = JSON.parse(jsonData) as MovieInfo;
          resolve(parsedData);
        } catch (e) {
          reject(new Error("Failed to parse ffprobe JSON output."));
        }
      } else {
        // 如果退出码非 0，代表失败。
        // 我们用一个包含详细错误信息的 Error 对象来 reject 这个 Promise。
        reject(
          new Error(`ffprobe process exited with code ${code}: ${errorData}`)
        );
      }
    });
  });
}
