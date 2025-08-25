import { spawn } from "node:child_process";
import path from "node:path";
import type { Job } from "bullmq";
import type {
  HlsJob,
  RemuxToMp4Job,
  TmdbApiRequestJob,
  TmdbMovieResponse,
  MovieInfo,
} from "@next-media/types";

import {
  getLibrary,
  getMovieByTmdbId,
  createMovie,
  createLibraryMovie,
  getLibraryMovieByLibraryIdAndMovieId,
} from "@next-media/db/db";

import { TMDB_BASE_URL } from "@next-media/constants";

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN!;

export function parseMovieFolder(folder: string) {
  let name = folder.trim();
  if (!name) return null;
  let year: string | undefined = undefined;
  const nameMatch = name.match(/^(.*?)\s*\((\d{4})\)$/);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1];
    year = nameMatch[2];
  }
  return { name, year };
}

function parseTimeToSeconds(timeString: string) {
  const parts = timeString.split(":");
  const hours = parseFloat(parts[0]!);
  const minutes = parseFloat(parts[1]!);
  const seconds = parseFloat(parts[2]!);
  return hours * 3600 + minutes * 60 + seconds;
}

export function executeFFmpeg(
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
        console.error("FFmpeg error output:", errorOutput);
        reject(new Error(`FFmpeg exited with code ${code}.`));
      }
    });

    ffmpegProcess.on("error", (err) => {
      console.error("Failed to start FFmpeg process.", err);
      reject(err);
    });
  });
}

export function getFFprobeMovieInfo(moviePath: string): Promise<MovieInfo> {
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
      console.error("Failed to start ffprobe process.", err);
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

export const tmdbApiRequest = async (job: Job<TmdbApiRequestJob>) => {
  const { userId, libraryPath, filePath, movieTitle, year } = job.data;
  console.log(`Processing job ${job.id} for file: ${filePath}`);

  // =================================================================
  // 1. 获取 Library
  // =================================================================
  const lib = await getLibrary(userId, libraryPath);
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

  let movieRecord = await getMovieByTmdbId(tmdbResult.id);

  if (!movieRecord) {
    const newMovies = await createMovie(tmdbResult);
    movieRecord = newMovies[0];
  }

  const existingLink = await getLibraryMovieByLibraryIdAndMovieId(
    lib.id,
    movieRecord!.id
  );

  if (existingLink) {
    console.log(
      `Movie "${movieRecord!.name}" is already linked to library "${
        lib.path
      }". Skipping.`
    );
    return { message: "Movie already linked." };
  }

  await createLibraryMovie(
    lib.id,
    movieRecord!.id,
    path.join(libraryPath, filePath)
  );
  console.log(
    `Successfully linked movie "${
      movieRecord!.name
    }" from path "${filePath}" to library "${lib.path}".`
  );
  return { success: true };
};

export const remuxToMp4 = async (job: Job<RemuxToMp4Job>) => {
  const { inputPath, outputPath } = job.data;
  console.info(`[Worker] 开始转码: ${inputPath}`);

  const movieInfo = await getFFprobeMovieInfo(inputPath);
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
  console.info(`[Worker] 开始转码为m3u8: ${inputPath}`);
  const movieInfo = await getFFprobeMovieInfo(inputPath);
  const totalDurationString = movieInfo.format.duration;
  const totalDurationInSeconds = parseFloat(totalDurationString);

  const ffmpegArgs = [
    "-y",
    "-i",
    inputPath,

    "-map",
    "0:v:0",
    "-map",
    "0:a:0",

    "-c:v",
    "copy",

    // 濾鏡
    "-af",
    "pan=stereo",

    // Encoder 及其參數
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-b:a",
    "192k",
    "-strict",
    "-2",

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
