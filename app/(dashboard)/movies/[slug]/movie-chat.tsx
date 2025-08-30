"use client";
import { Message, MessageContent } from "@/components/ai/message";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai/prompt-input";

import { Sparkles } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai/conversation";
import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai/response";
import { DefaultChatTransport } from "ai";
import type { MovieContext } from "@/server/api/routes/chat";
import { Loader } from "@/components/ai/loader";

interface MovieChatProps {
  movieContext: MovieContext;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function MovieChat({ movieContext, videoRef }: MovieChatProps) {
  const body = {
    movieContext,
  };

  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      body,
    }),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const currentTime = videoRef.current?.currentTime.toFixed(1) ?? 0;
      console.log("当前播放时间是", currentTime);
      sendMessage(
        { text: input },
        {
          body: {
            movieContext: {
              ...movieContext,
              timestamp: currentTime,
            },
          },
        }
      );
      setInput("");
    }
  };

  return (
    <Sheet>
      <SheetTrigger>
        <Badge
          variant="secondary"
          className="cursor-default py-1 flex items-center gap-1.5 border-violet-200 dark:border-violet-800 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Chat</span>
        </Badge>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>Ask AI about this movie</SheetDescription>
        </SheetHeader>

        <Conversation className="flex-1 pr-4">
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <Response key={`${message.id}-${i}`}>
                            {part.text}
                          </Response>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="p-4 pt-0">
          <PromptInput onSubmit={handleSubmit} className="relative">
            <PromptInputTextarea
              value={input}
              placeholder="Say something..."
              onChange={(e) => setInput(e.currentTarget.value)}
            />
            <PromptInputSubmit
              status={status === "streaming" ? "streaming" : "ready"}
              disabled={!input.trim()}
              className="absolute bottom-2 right-2 size-8"
            />
          </PromptInput>
        </div>
      </SheetContent>
    </Sheet>
  );
}
