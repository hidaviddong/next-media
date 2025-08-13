"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AlignLeftIcon, Calendar, MoveLeftIcon, Play } from "lucide-react";
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
import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { useMoviePath } from "../hooks";
import { toast } from "sonner";

interface MovieDetailProps {
  movieRecord: Movie;
}

export function MovieDetail({ movieRecord }: MovieDetailProps) {
  const [hasPlayButtonClick, setHasPlayButtonClick] = useAtom(
    hasPlayButtonClickAtom
  );

  const { moviePathQuery } = useMoviePath(movieRecord.tmdbId.toString());
  const moviePath = moviePathQuery.data?.path;

  return (
    <div className="py-8">
      {/* Back Button with Movie Poster */}
      <AnimatePresence>
        {hasPlayButtonClick && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6"
          >
            <motion.div
              layoutId={`movie-${movieRecord.tmdbId}`}
              layout="position"
              className="w-8 h-8 rounded-md overflow-hidden cursor-pointer"
              onClick={() => setHasPlayButtonClick(false)}
            >
              {movieRecord.poster && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="icon" className="size-8">
                      <MoveLeftIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{movieRecord.name}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        {hasPlayButtonClick ? (
          <motion.div
            key="player"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {moviePath && movieRecord.poster && (
              <MoviePlayer
                moviePath={moviePath}
                posterPath={movieRecord.poster}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Poster */}
            <div className="lg:col-span-1">
              <div className="w-full max-w-sm mx-auto lg:mx-0">
                <motion.div
                  layoutId={`movie-${movieRecord.tmdbId}`}
                  layout="position"
                  className="rounded-lg overflow-hidden shadow-lg border border-neutral-200"
                >
                  <AspectRatio ratio={2 / 3}>
                    {movieRecord.poster && (
                      <Image
                        src={`${TMDB_IMAGE_BASE_URL}${movieRecord.poster}`}
                        alt={`Poster for ${movieRecord.name}`}
                        fill
                        className="object-cover"
                        priority
                      />
                    )}
                  </AspectRatio>
                </motion.div>
              </div>
            </div>

            {/* Movie Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <motion.h1
                  layoutId={`title-${movieRecord.tmdbId}`}
                  className="text-3xl lg:text-5xl font-bold text-neutral-900 leading-tight"
                >
                  {movieRecord.name}
                </motion.h1>

                <div className="flex flex-wrap items-center gap-4 text-neutral-600">
                  {movieRecord.year && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{movieRecord.year}</span>
                    </motion.div>
                  )}
                </div>

                {movieRecord.overview && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-lg text-neutral-700 leading-relaxed max-w-3xl"
                  >
                    {movieRecord.overview}
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="flex flex-wrap gap-3 pt-4"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          // 如果没有电影路径
                          if (!moviePath) {
                            toast.error("Movie path not found");
                            return;
                          }
                          setHasPlayButtonClick(true);
                        }}
                        size="lg"
                        className="bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Play
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{moviePath}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
