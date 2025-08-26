"use client";

import { useState, useEffect } from "react";
import { Calculator, Calendar, Smile } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMovieLists } from "./hooks";
import { useRouter } from "next/navigation";
import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";

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
              </Avatar>
              <span>{movie.movie.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
