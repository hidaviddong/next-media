import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

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

export async function remuxToMp4(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const ffmpegArgs: string[] = [
    "-i",
    inputPath,
    "-c",
    "copy",
    "-sn",
    outputPath,
  ];

  // 执行 FFmpeg 进程
  return new Promise((resolve, reject) => {
    console.log("Executing FFmpeg with args:", ffmpegArgs.join(" "));
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    let errorOutput = "";
    ffmpegProcess.stderr.on("data", (data) => {
      console.log(`[FFMPEG-LOG]: ${data.toString()}`);
      errorOutput += data.toString();
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        console.log(`Successfully processed ${inputPath} to ${outputPath}`);
        resolve();
      } else {
        const errorMessage = `Failed to process ${inputPath}. FFmpeg exited with code ${code}.`;
        console.error(errorMessage);
        console.error("FFmpeg error output:", errorOutput);
        reject(new Error(errorMessage));
      }
    });

    ffmpegProcess.on("error", (err) => {
      console.error("Failed to start FFmpeg process.", err);
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

export function waitForFile(filePath: string, timeout = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (existsSync(filePath)) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error(`File creation timed out: ${filePath}`));
      }
    }, 500);
  });
}
