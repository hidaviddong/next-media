"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { addFolderDialogOpenAtom } from "@/lib/store";
import { BadRequestError } from "@/lib/error";
import QueueStatus from "./queue-status";

export interface Movie {
  name: string;
  year?: string;
  path: string;
}
interface ScanMoviesResponse {
  data: Array<Movie>;
}

export default function AddFolderDialog() {
  const [showQueueStatus, setShowQueueStatus] = useState(false);
  const queryClient = useQueryClient();
  const [addFolderDialogOpen, setAddFolderDialogOpen] = useAtom(
    addFolderDialogOpenAtom
  );
  const isMobile = useIsMobile();
  const [folderPath, setFolderPath] = useState("");
  const [parsedMovies, setParsedMovies] = useState<Array<Movie>>([]);

  const { mutate: scanMoviesMutate, isPending: isScanMoviesPending } =
    useMutation({
      mutationFn: async (body: { folderPath: string }) => {
        const response = await fetch("/api/movies/scan", {
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new BadRequestError(errorData.error);
        }
        return response.json() as Promise<ScanMoviesResponse>;
      },
      onSuccess: (data) => {
        setParsedMovies(data.data);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutate: queueMoviesMutate, isPending: isQueueMoviesPending } =
    useMutation({
      mutationFn: async (body: { movies: Array<Movie> }) => {
        await fetch("/api/movies/queue", {
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
      onSuccess: () => {
        toast.success("Movies queued successfully");
        queryClient.invalidateQueries({ queryKey: ["queue-status"] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleAddFolder = () => {
    if (!folderPath.trim()) {
      toast.error("Please enter a folder path");
      return;
    }
    scanMoviesMutate({ folderPath });
  };

  const handleRemoveMovie = (index: number) => {
    setParsedMovies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (parsedMovies.length === 0) {
      toast.error("Please add at least one movie folder");
      return;
    }
    queueMoviesMutate({ movies: parsedMovies });
    setShowQueueStatus(true);
    setFolderPath("");
    setParsedMovies([]);
  };

  const handleCancel = () => {
    setAddFolderDialogOpen(false);
    setShowQueueStatus(false);
    setFolderPath("");
    setParsedMovies([]);
  };

  if (!isMobile) {
    return (
      <Dialog open={addFolderDialogOpen} onOpenChange={setAddFolderDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="folder" className="text-sm font-medium">
                Folder Path
              </label>
              <div className="flex gap-2">
                <Input
                  id="folder"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="Enter movie folder path"
                />
                <Button
                  onClick={handleAddFolder}
                  disabled={isScanMoviesPending}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {parsedMovies.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Parsed Movies:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {parsedMovies.map((movie, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{movie.name}</span>
                        {movie.year && (
                          <span className="text-muted-foreground ml-2">
                            ({movie.year})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMovie(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showQueueStatus && <QueueStatus />}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={parsedMovies.length === 0 || isQueueMoviesPending}
              >
                {isQueueMoviesPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={addFolderDialogOpen} onOpenChange={setAddFolderDialogOpen}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Add Folder</DrawerTitle>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="folder" className="text-sm font-medium">
                Folder Path
              </label>
              <div className="flex gap-2">
                <Input
                  id="folder"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="Enter movie folder path"
                />
                <Button
                  onClick={handleAddFolder}
                  disabled={isScanMoviesPending}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {parsedMovies.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Parsed Movies:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {parsedMovies.map((movie, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{movie.name}</span>
                        {movie.year && (
                          <span className="text-muted-foreground ml-2">
                            ({movie.year})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMovie(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showQueueStatus && <QueueStatus />}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={parsedMovies.length === 0 || isQueueMoviesPending}
              >
                {isQueueMoviesPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
