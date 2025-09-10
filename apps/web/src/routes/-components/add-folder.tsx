import {
  useQueueMovies,
  useScanMovies,
  useUserLibrary,
} from "@/integrations/tanstack-query/query";
import { Button } from "@next-media/ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@next-media/ui/tooltip.tsx";
import { Loader2, Plus, RefreshCcw } from "lucide-react";
import { Capacity } from "./capacity";

export function AddFolder() {
  const { userLibraryQuery } = useUserLibrary();

  const scanMovies = useScanMovies();
  const queueMovies = useQueueMovies();

  const userLibrary = userLibraryQuery.data?.userLibrary;

  return (
    <>
      {userLibrary ? (
        <div className="flex items-center justify-end gap-2">
          <Capacity />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={scanMovies.isPending || queueMovies.isPending}
                variant="ghost"
                onClick={() => {
                  const libraryPath = userLibrary.path;
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
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Folder</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );
}
