import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { Hono } from "hono";
import type { Variables } from "../type";
import { deepseek } from "@ai-sdk/deepseek";
import {
  type ToolSet,
  type InferUITools,
  type UIDataTypes,
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from "ai";
import { z } from "zod";

export interface MovieContext {
  name: string;
  overview: string;
  movieFolderPath: string;
  subtitleIndex: number;
  timestamp: number;
}

function generateSystemPrompt(movieContext: MovieContext) {
  return `
### Role and Goal
You are an intelligent and helpful movie companion. Your primary goal is to answer user questions about the movie they are currently watching, enhancing their viewing experience.

### Context Provided
For each user query, you will be provided with the following information:
1.  **Movie Details:** The name, and overview of the movie.
2.  **Current Timestamp:** The exact point in time (e.g., in seconds) in the movie the user is at.
3.  **Movie Folder Path:** The path to the movie folder.
4.  **Movie Subtitle Index:** The index of the subtitle.

### Core Instructions & Tool Usage
1.  When a user asks a question, first consider the context of the scene at the provided 'timestamp'.
2.  You have a critical tool: 'getDialogueAtTimestamp({ movieFolderPath: string, subtitleIndex: number, timestamp: number, window: number })'. This tool fetches the subtitles/dialogue within a specific time window around the given timestamp.
3.  You **MUST** use this tool whenever the user's question is about the current plot, a character's recent dialogue, or events happening around the provided timestamp. For example, for questions like "What did he just say?", "Who is this person that just appeared?", or "Why are they arguing?".
4.  Use the information from the tool, combined with the overall movie details, to formulate a comprehensive and accurate answer.

### Rules of Engagement
1.  **Language Parity:** You **MUST** respond in the same language the user uses to ask their question. For example, if they ask in Chinese, you answer in Chinese. If they ask in English, you answer in English.
2.  **Spoiler-Free:** Do not reveal plot points that occur significantly after the provided timestamp unless the user explicitly asks for spoilers.
3.  **Be Concise:** Provide direct and relevant answers based on the available context.

Here is the movie context:
  Movie name: ${movieContext.name}
  Movie overview: ${movieContext.overview}
  Movie folder path: ${movieContext.movieFolderPath}
  Movie subtitle index: ${movieContext.subtitleIndex}
  Current movie timestamp: ${movieContext.timestamp}
  The default window duration is 60 seconds. But you can change it when user need to see more context.
`;
}

async function getDialogueAtTimestamp(
  movieFolderPath: string,
  subtitleIndex: string,
  timestamp: string,
  windowDuration: number
) {
  // 定义上下文时间窗口（秒）
  // 计算起始时间，并确保不为负数
  const startTime = Math.max(0, Number(timestamp) - windowDuration / 2);

  const files = await fs.readdir(movieFolderPath);
  const videoFile = files.find((f) => f.endsWith(".mkv"));
  if (!videoFile) {
    throw new Error("No video file found in the specified path.");
  }

  const videoFullPath = path.join(movieFolderPath, videoFile);

  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-ss",
      startTime.toString(),
      "-i",
      videoFullPath,
      "-t",
      windowDuration.toString(), // 提取指定时长
      "-map",
      `0:${subtitleIndex}`, // 映射指定的字幕流
      "-c:s",
      "srt", // 将字幕编解码为 SRT 格式
      "-f",
      "srt", // 强制输出格式为 SRT
      "pipe:1", // 输出到标准输出
    ];

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    let srtOutput = "";
    let errorOutput = "";

    ffmpegProcess.stdout.on("data", (chunk) => {
      srtOutput += chunk.toString();
    });

    ffmpegProcess.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("FFmpeg stderr:", errorOutput);
        return reject(
          new Error(
            `FFmpeg process exited with code ${code}. Error: ${errorOutput}`
          )
        );
      }

      if (!srtOutput.trim()) {
        return resolve("No dialogue found at the specified timestamp.");
      }
      resolve(srtOutput);
    });

    ffmpegProcess.on("error", (err) => {
      reject(err);
    });
  });
}

const tools = {
  getDialogueAtTimestamp: tool({
    description:
      "You can use this tool to get the dialogue in the movie subtitles at a timestamp",
    inputSchema: z.object({
      movieFolderPath: z.string().describe("The path to the movie folder"),
      subtitleIndex: z.string().describe("The index of the subtitle"),
      timestamp: z.string().describe("The timestamp to get the dialogue for"),
      windowDuration: z
        .number()
        .describe("The duration of the dialogue")
        .default(60),
    }),
    execute: async ({
      movieFolderPath,
      subtitleIndex,
      timestamp,
      windowDuration,
    }) => {
      try {
        const dialogue = await getDialogueAtTimestamp(
          movieFolderPath,
          subtitleIndex,
          timestamp,
          windowDuration
        );
        return dialogue;
      } catch (e) {
        console.error(e);
        throw new Error("Failed to get dialogue at timestamp", { cause: e });
      }
    },
  }),
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export const chatRoute = new Hono<{ Variables: Variables }>().post(
  "/",
  async (c) => {
    const {
      messages,
      movieContext,
    }: { messages: UIMessage[]; movieContext: MovieContext } =
      await c.req.json();
    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: generateSystemPrompt(movieContext),
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(3),
      tools,
    });
    return result.toUIMessageStreamResponse();
  }
);
