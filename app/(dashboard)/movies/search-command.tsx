"use client";

import { useState, useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@next-media/ui/command.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@next-media/ui/avatar.tsx";
import { useMovieLists } from "./hooks";
import { useRouter } from "next/navigation";
import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchCommand() {
  const { movieListsQuery } = useMovieLists();
  const [open, setOpen] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Backspace" &&
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        router.back();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a movie title or search..." />
      <CommandList>
        <CommandEmpty>No movies found.</CommandEmpty>
        <CommandGroup>
          {movieListsQuery.data?.map((movie) => (
            <CommandItem
              key={movie.movie.id}
              onSelect={() => {
                router.push(`/movies/${movie.movie.tmdbId}`);
              }}
            >
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage
                  src={`${TMDB_IMAGE_BASE_URL}${movie.movie.poster}`}
                  alt={movie.movie.name}
                />
                <AvatarFallback>
                  {movie.movie.name.charAt(0).toUpperCase()}
                </AvatarFallback>

                {movie.isWatched && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </Avatar>
              <span
                className={cn(
                  "truncate",
                  movie.isWatched && "text-neutral-500"
                )}
              >
                {movie.movie.name}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
