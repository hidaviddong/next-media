import { spawn } from "node:child_process";

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

export function remuxToMp4(inputPath: string, outputPath: string) {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = ["-i", inputPath, "-c", "copy", "-sn", outputPath];
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    let errorOutput = "";
    ffmpegProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        console.log(`Successfully remuxed to ${outputPath}`);
        resolve("");
      } else {
        console.error(
          `Failed to remux ${inputPath}. FFmpeg exited with code ${code}.`
        );
        console.error("FFmpeg error output:", errorOutput);
        reject(new Error(`FFmpeg failed with code ${code}`)); // 转换失败，Promise 拒绝
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
