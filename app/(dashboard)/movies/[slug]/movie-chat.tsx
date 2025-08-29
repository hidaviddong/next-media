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
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai/response";
import { DefaultChatTransport } from "ai";

export default function MovieChat() {
  const body = {
    movieContext: {
      title: "Annie Hall",
      actors: "Woody Allen, Diane Keaton",
      description:
        "New York comedian Alvy Singer falls in love with the ditsy Annie Hall.",
      movieFolderPath: "/Users/daviddong/Movies2/安妮·霍尔(1977)",
      subtitleIndex: 2,
      timestamp: 3052,
    },
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
      sendMessage({ text: input });
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

        <div className="flex-1 overflow-y-auto pr-4">
          <Conversation>
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
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

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
