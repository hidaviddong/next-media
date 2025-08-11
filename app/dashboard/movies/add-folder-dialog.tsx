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
import { useIsMobile } from "@/lib/hooks";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useAtom } from "jotai";
import { addFolderDialogOpenAtom } from "@/lib/store";
import { useQueueMovies, useScanMovies } from "./hooks";

export default function AddFolderDialog() {
  const [addFolderDialogOpen, setAddFolderDialogOpen] = useAtom(
    addFolderDialogOpenAtom
  );
  const isMobile = useIsMobile();
  const [libraryPath, setLibraryPath] = useState("");
  const scanMovies = useScanMovies();
  const queueMovies = useQueueMovies();

  const handleAddFolder = () => {
    if (!libraryPath.trim()) {
      toast.error("Please enter a folder path");
      return;
    }
    scanMovies.mutate({ libraryPath });
  };

  const handleRemoveMovie = (index: number) => {
    scanMovies.setScanMovies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (scanMovies.scanMovies.length === 0) {
      toast.error("Please add at least one movie folder");
      return;
    }
    queueMovies.mutate({
      movies: scanMovies.scanMovies.map((movie) => ({
        libraryPath,
        folderName: movie.folderName,
        movieTitle: movie.name,
        year: movie.year,
      })),
    });
    setAddFolderDialogOpen(false);
    setLibraryPath("");
    scanMovies.setScanMovies([]);
  };

  const handleCancel = () => {
    setAddFolderDialogOpen(false);
    setLibraryPath("");
    scanMovies.setScanMovies([]);
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
              <label htmlFor="library" className="text-sm font-medium">
                Library Path
              </label>
              <div className="flex gap-2">
                <Input
                  id="library"
                  value={libraryPath}
                  onChange={(e) => setLibraryPath(e.target.value)}
                  placeholder="Enter movie folder path"
                />
                <Button
                  onClick={handleAddFolder}
                  disabled={scanMovies.isPending}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {scanMovies.scanMovies.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Parsed Movies:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scanMovies.scanMovies.map((movie, index) => (
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

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  scanMovies.scanMovies.length === 0 || queueMovies.isPending
                }
              >
                {queueMovies.isPending ? (
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
              <label htmlFor="library" className="text-sm font-medium">
                Library Path
              </label>
              <div className="flex gap-2">
                <Input
                  id="library"
                  value={libraryPath}
                  onChange={(e) => setLibraryPath(e.target.value)}
                  placeholder="Enter movie folder path"
                />
                <Button
                  onClick={handleAddFolder}
                  disabled={scanMovies.isPending}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {scanMovies.scanMovies.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Parsed Movies:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scanMovies.scanMovies.map((movie, index) => (
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

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  scanMovies.scanMovies.length === 0 || queueMovies.isPending
                }
              >
                {queueMovies.isPending ? (
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
