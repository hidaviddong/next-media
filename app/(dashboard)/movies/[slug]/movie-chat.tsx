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
import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai/response";
import { type ChatStatus, DefaultChatTransport } from "ai";
import type { MovieContext } from "@/server/api/routes/chat";
import { Loader } from "@/components/ai/loader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd, KbdKey } from "@/components/ui/kbd";
import { useIsMobile } from "@/lib/hooks";

interface MovieChatProps {
  movieContext: Omit<MovieContext, "timestamp">;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

function MovieChatTrigger() {
  return (
    <Badge
      variant="secondary"
      className="cursor-pointer py-1 flex items-center gap-1.5 border-violet-200 bg-violet-100 hover:bg-violet-200 text-violet-800"
    >
      <Sparkles className="wxw-3.5 h-3.5" />
      <span>AI Chat</span>
    </Badge>
  );
}

function MovieChatContent() {
  return (
    <Kbd>
      <KbdKey aria-label="Meta">⌘</KbdKey>
      <KbdKey>k</KbdKey>
    </Kbd>
  );
}

function ChatConversation({
  messages,
  status,
}: {
  messages: any[];
  status: string;
}) {
  return (
    <Conversation className="flex-1 pr-4">
      <ConversationContent>
        {messages.map((message) => (
          <Message from={message.role} key={message.id}>
            <MessageContent>
              {message.parts.map((part: any, i: number) => {
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
  );
}

function ChatInput({
  input,
  setInput,
  handleSubmit,
  status,
  stop,
}: {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  status: ChatStatus;
  stop: () => Promise<void>;
}) {
  return (
    <div className="p-4 pt-0">
      <PromptInput onSubmit={handleSubmit} className="relative">
        <PromptInputTextarea
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
        <PromptInputSubmit
          status={status === "streaming" ? "streaming" : "ready"}
          disabled={status === "submitted"}
          className="absolute bottom-2 right-2 size-8"
          onClick={status === "streaming" ? stop : undefined}
        />
      </PromptInput>
    </div>
  );
}

export default function MovieChat({ movieContext, videoRef }: MovieChatProps) {
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
            <MovieChatTrigger />
          </TooltipTrigger>
          <TooltipContent>
            <MovieChatContent />
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

        <ChatConversation messages={messages} status={status} />
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          status={status}
          stop={stop}
        />
      </SheetContent>
    </Sheet>
  );
}
