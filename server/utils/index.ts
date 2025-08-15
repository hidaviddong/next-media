import { spawn } from "node:child_process";

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
export function convertSrtToVtt(srtContent: string) {
  // 1. 添加 VTT 文件头，并确保前后有两个换行符作为分隔。
  let vttContent = "WEBVTT\n\n";

  // 2. 将 SRT 内容按“块”分割。每个字幕块由两个换行符分隔。
  //    使用 .trim() 去除首尾可能存在的空白。
  const cues = srtContent.trim().split(/\n\n+/);

  // 3. 遍历每一个字幕块并进行转换
  vttContent += cues
    .map((cue) => {
      // 将每个块按行分割
      const lines = cue.split("\n");

      // 第 0 行是序列号，我们直接丢弃
      // 第 1 行是时间戳
      const timestampLine = lines[1];

      // 如果时间戳行不存在，则这是一个无效的块，跳过它
      if (!timestampLine) {
        return "";
      }

      // 规则 #3: 将时间戳中的逗号替换为句点
      const vttTimestamp = timestampLine.replace(/,/g, ".");

      // 第 2 行及之后都是字幕文本
      const textLines = lines.slice(2).join("\n");

      // 重新组合成 VTT 格式的块
      return `${vttTimestamp}\n${textLines}`;
    })
    .join("\n\n"); // 用两个换行符将所有处理好的块重新连接起来

  return vttContent;
}

export interface MovieInfo {
  streams: Record<string, any>[];
  format: Record<string, any>;
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
