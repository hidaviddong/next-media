"use client";
import { Loader2, Plus, RefreshCcw } from "lucide-react";
import AddFolderDialog from "./add-folder-dialog";
import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { addFolderDialogOpenAtom } from "@/lib/store";
import { useQueueMovies, useScanMovies, useUserLibrary } from "./hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AddFolder() {
  const setAddFolderDialogOpen = useSetAtom(addFolderDialogOpenAtom);
  const { userLibraryQuery } = useUserLibrary();

  const scanMovies = useScanMovies();
  const queueMovies = useQueueMovies();

  return (
    <>
      {userLibraryQuery.data?.userLibrary ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={scanMovies.isPending || queueMovies.isPending}
                variant="ghost"
                onClick={() => {
                  const libraryPath = userLibraryQuery.data.userLibrary!.path;
                  scanMovies.mutate(
                    {
                      libraryPath,
                    },
                    {
                      onSuccess(data) {
                        const movieLists = data.data;
                        queueMovies.mutate({
                          movies: movieLists.map((movie) => ({
                            libraryPath,
                            filePath: movie.folderName,
                            movieTitle: movie.name,
                            year: movie.year,
                          })),
                        });
                      },
                    }
                  );
                }}
              >
                {scanMovies.isPending || queueMovies.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh</p>
            </TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setAddFolderDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Folder</p>
            </TooltipContent>
          </Tooltip>
          <AddFolderDialog />
        </>
      )}
    </>
  );
}
