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
import { parseMoviesFolder } from "./actions";
import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect, useState, startTransition } from "react";
import { Plus, X } from "lucide-react";

type ActionState = {
  error?: string;
  values: { folder: string };
  movies?: Array<{ name: string; year?: string }>;
};

interface AddFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (movies: Array<{ name: string; year?: string }>) => void;
}

export default function AddFolderDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddFolderDialogProps) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const [folderPath, setFolderPath] = useState("");
  const [parsedMovies, setParsedMovies] = useState<
    Array<{ name: string; year?: string }>
  >([]);

  const [state, formAction, isPending] = useActionState(parseMoviesFolder, {
    values: { folder: "" },
  });

  // Listen for errors and show toast
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  // Listen for success state
  useEffect(() => {
    if (state.movies && state.movies.length > 0) {
      setParsedMovies(state.movies);
      toast.success(`Successfully parsed ${state.movies.length} movies`);
    }
  }, [state.movies]);

  const handleAddFolder = () => {
    if (!folderPath.trim()) {
      toast.error("Please enter a folder path");
      return;
    }

    const formData = new FormData();
    formData.append("folder", folderPath);

    startTransition(() => {
      formAction(formData);
    });
  };

  const handleRemoveMovie = (index: number) => {
    setParsedMovies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (parsedMovies.length === 0) {
      toast.error("Please add at least one movie folder");
      return;
    }
    onSubmit(parsedMovies);
    onOpenChange(false);
    // Reset state
    setFolderPath("");
    setParsedMovies([]);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state
    setFolderPath("");
    setParsedMovies([]);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Folder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add Folder Input */}
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
                  onKeyPress={(e) => e.key === "Enter" && handleAddFolder()}
                />
                <Button
                  onClick={handleAddFolder}
                  disabled={isPending || !folderPath.trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Parsed Movies List */}
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={parsedMovies.length === 0}
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Add Folder</DrawerTitle>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            {/* Add Folder Input */}
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
                  onKeyPress={(e) => e.key === "Enter" && handleAddFolder()}
                />
                <Button
                  onClick={handleAddFolder}
                  disabled={isPending || !folderPath.trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Parsed Movies List */}
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={parsedMovies.length === 0}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
