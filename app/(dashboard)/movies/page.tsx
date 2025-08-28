"use client";
import { motion } from "motion/react";
import AddFolder from "./add-folder";
import QueueStatus from "./queue-status";
import MovieList from "./movie-lists";
import SearchCommand from "./search-command";

export default function MoviesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <AddFolder />
      <SearchCommand />
      <QueueStatus />
      <MovieList />
    </motion.div>
  );
}
