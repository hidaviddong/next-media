"use client";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useAtom } from "jotai";
import { hasPlayButtonClickAtom } from "@/lib/store";
import { AnimatePresence, motion } from "motion/react";
import type { Movie } from "@/lib/types";
import Image from "next/image";

interface MovieHeaderProps {
  movieRecord: Movie;
  posterUrl: string;
}

export function MovieHeader({ movieRecord, posterUrl }: MovieHeaderProps) {
  const [hasPlayButtonClick, setHasPlayButtonClick] = useAtom(
    hasPlayButtonClickAtom
  );
  return (
    <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-200">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/movies"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            onClick={() => setHasPlayButtonClick(false)}
          >
            <ArrowLeft className="w-5 h-5" />
            <AnimatePresence>
              {hasPlayButtonClick && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="flex items-center gap-4"
                >
                  <motion.div
                    layoutId="poster"
                    className="w-10 h-10 rounded-md overflow-hidden"
                  >
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={`Poster for ${movieRecord.name}`}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-200" />
                    )}
                  </motion.div>
                  <div className="flex flex-col">
                    <motion.h2
                      layoutId="title"
                      className="font-semibold text-neutral-900 truncate"
                    >
                      {movieRecord.name}
                    </motion.h2>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>
    </div>
  );
}
