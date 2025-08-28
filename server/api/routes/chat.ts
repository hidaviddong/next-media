import { Hono } from "hono";
import type { Variables } from "../type";
import { deepseek } from "@ai-sdk/deepseek";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const chatRoute = new Hono<{ Variables: Variables }>().post(
  "/",
  async (c) => {
    const { messages }: { messages: UIMessage[] } = await c.req.json();
    const result = streamText({
      model: deepseek("deepseek-chat"),
      messages: convertToModelMessages(messages),
    });
    return result.toUIMessageStreamResponse();
  }
);
