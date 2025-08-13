"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Calendar, Play } from "lucide-react";
import Image from "next/image";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAtom } from "jotai";
import { hasPlayButtonClickAtom } from "@/lib/store";
import MoviePlayer from "./movie-player";
import type { Movie } from "@/lib/types";
import { AnimatePresence, motion } from "motion/react";

interface MovieDetailProps {
  posterUrl: string;
  movieRecord: Movie;
  path: string;
}
export function MovieDetail({
  posterUrl,
  movieRecord,
  path,
}: MovieDetailProps) {
  const [hasPlayButtonClick, setHasPlayButtonClick] = useAtom(
    hasPlayButtonClickAtom
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <AnimatePresence initial={false} mode="wait">
        {hasPlayButtonClick ? (
          <motion.div
            key="player"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            <MoviePlayer path={path} />
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Poster */}
            <div className="lg:col-span-1">
              <div className="w-full max-w-sm mx-auto lg:mx-0">
                <motion.div layoutId="poster">
                  <AspectRatio
                    ratio={2 / 3}
                    className="rounded-lg overflow-hidden shadow-lg border border-neutral-200"
                  >
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={`Poster for ${movieRecord.name}`}
                        fill
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div className="flex items-center justify-center bg-neutral-100">
                        <span className="text-neutral-500">No Image</span>
                      </div>
                    )}
                  </AspectRatio>
                </motion.div>
              </div>
            </div>

            {/* Movie Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <motion.h1
                  layoutId="title"
                  className="text-3xl lg:text-5xl font-bold text-neutral-900 leading-tight"
                >
                  {movieRecord.name}
                </motion.h1>

                <div className="flex flex-wrap items-center gap-4 text-neutral-600">
                  {movieRecord.year && (
                    <motion.div
                      layoutId="year"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{movieRecord.year}</span>
                    </motion.div>
                  )}
                </div>

                {movieRecord.overview && (
                  <p className="text-lg text-neutral-700 leading-relaxed max-w-3xl">
                    {movieRecord.overview}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setHasPlayButtonClick(true)}
                        size="lg"
                        className="bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Play
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{path}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
