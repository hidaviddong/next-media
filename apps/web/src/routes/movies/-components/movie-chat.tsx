import { Badge } from "@next-media/ui/badge.tsx";
import { Message, MessageContent } from "@next-media/ui/message.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@next-media/ui/sheet.tsx";
import type React from "react";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@next-media/ui/prompt-input.tsx";

import { Sparkles } from "lucide-react";

import { useIsMobile } from "@/integrations/hooks/use-ismobile";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@next-media/ui/conversation.tsx";
import { Kbd, KbdKey } from "@next-media/ui/kbd.tsx";
import { Loader } from "@next-media/ui/loader.tsx";
import { Response } from "@next-media/ui/response.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@next-media/ui/tooltip.tsx";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

interface MovieContext {
  name: string;
  overview: string;
  movieFolderPath: string;
  subtitleIndex: number;
  timestamp: number;
}

interface MovieChatProps {
  movieContext: Omit<MovieContext, "timestamp">;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function MovieChat({ movieContext, videoRef }: MovieChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      body: {
        movieContext,
      },
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const currentTime = videoRef.current?.currentTime.toFixed(1) ?? 0;
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="cursor-pointer py-1 flex items-center gap-1.5 border-violet-200 bg-violet-100 hover:bg-violet-200 text-violet-800"
            >
              <Sparkles className="wxw-3.5 h-3.5" />
              <span>AI Chat</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <Kbd>
              <KbdKey aria-label="Meta">⌘</KbdKey>
              <KbdKey>k</KbdKey>
            </Kbd>
          </TooltipContent>
        </Tooltip>
      </SheetTrigger>
      <SheetContent
        className="flex flex-col h-1/2 top-auto"
        side={isMobile ? "bottom" : "right"}
      >
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
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInput(e.currentTarget.value)
              }
            />
            <PromptInputSubmit
              status={status === "streaming" ? "streaming" : "ready"}
              disabled={status === "submitted"}
              className="absolute bottom-2 right-2 size-8"
              onClick={status === "streaming" ? stop : undefined}
            />
          </PromptInput>
        </div>
      </SheetContent>
    </Sheet>
  );
}
