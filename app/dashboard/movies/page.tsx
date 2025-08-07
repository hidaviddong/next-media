"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AddFolderDialog from "./add-folder-dialog";
import MovieStatusList, {
  MovieWithStatus,
  MovieStatus,
} from "./movie-status-list";
import { processMoviesBatch } from "./mock-api";

export default function MoviesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movies, setMovies] = useState<MovieWithStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmitMovies = async (
    parsedMovies: Array<{ name: string; year?: string }>
  ) => {
    // Convert parsed movies to status format
    const moviesWithStatus: MovieWithStatus[] = parsedMovies.map(
      (movie, index) => ({
        id: `movie-${Date.now()}-${index}`,
        name: movie.name,
        year: movie.year,
        status: "pending" as MovieStatus,
      })
    );

    setMovies(moviesWithStatus);
    setIsProcessing(true);
    toast.success(`Started processing ${parsedMovies.length} movies`);

    try {
      // Process movies in batch
      const results = await processMoviesBatch(parsedMovies);

      // Update movie statuses based on results
      setMovies((prev) =>
        prev.map((movie, index) => {
          const result = results[index];
          if (result.result.success) {
            return { ...movie, status: "success" as MovieStatus };
          } else {
            return {
              ...movie,
              status: "failed" as MovieStatus,
              errorMessage: result.result.error,
            };
          }
        })
      );

      // Count results
      const successCount = results.filter((r) => r.result.success).length;
      const failedCount = results.length - successCount;

      if (failedCount > 0) {
        toast.error(`${failedCount} movies failed to process`);
      }
      if (successCount > 0) {
        toast.success(`${successCount} movies processed successfully`);
      }
    } catch (error) {
      toast.error("Failed to process movies");
      // Mark all as failed
      setMovies((prev) =>
        prev.map((movie) => ({
          ...movie,
          status: "failed" as MovieStatus,
          errorMessage: "Processing failed",
        }))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Movies</h1>
        <p className="text-muted-foreground">Manage your movie collection</p>
      </div>

      {/* Add Folder Button - Always visible */}
      <div className="mb-6">
        <Button onClick={() => setDialogOpen(true)} disabled={isProcessing}>
          <Plus className="h-4 w-4 mr-2" />
          Add Folder
        </Button>
      </div>

      {/* Movie Status List */}
      <MovieStatusList movies={movies} />

      {/* Add Folder Dialog */}
      <AddFolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitMovies}
      />
    </>
  );
}
