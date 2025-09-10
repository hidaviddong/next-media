import {
  useQueueMovies,
  useScanMovies,
  useUserLibrary,
} from "@/integrations/tanstack-query/query";
import { toast } from "sonner";
import { Button } from "@next-media/ui/button.tsx";
import { Input } from "@next-media/ui/input.tsx";
import { Label } from "@next-media/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@next-media/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@next-media/ui/dialog.tsx";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@next-media/ui/tooltip.tsx";
import { Loader2, Plus, RefreshCcw, X } from "lucide-react";
import { Capacity } from "./capacity";
import { useState } from "react";

const stepText = {
  1: "Add Folder",
  2: "Parsed Movies",
  3: "Settings",
};

export function AddFolderDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, onOpenChange } = props;
  const [libraryPath, setLibraryPath] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [capacityValue, setCapacityValue] = useState<number>(50);
  const [capacityUnit, setCapacityUnit] = useState<"GB" | "TB">("GB");
  const scanMovies = useScanMovies();
  const queueMovies = useQueueMovies();

  const handleNextFromStep1 = () => {
    if (!libraryPath.trim()) {
      toast.error("Please enter a folder path");
      return;
    }
    scanMovies.mutate({ libraryPath });
    setStep(2);
  };

  const handleRemoveMovie = (index: number) => {
    scanMovies.setScanMovies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (scanMovies.scanMovies.length === 0) {
      toast.error("Please add at least one movie folder");
      return;
    }
    console.log(capacityValue, capacityUnit);
    queueMovies.mutate({
      movies: scanMovies.scanMovies.map((movie) => ({
        libraryPath,
        filePath: movie.folderName,
        movieTitle: movie.name,
        year: movie.year,
      })),
      maxCacheBytes:
        capacityValue *
        (capacityUnit === "GB"
          ? 1024 * 1024 * 1024
          : 1024 * 1024 * 1024 * 1024),
    });
    onOpenChange(false);
    setLibraryPath("");
    scanMovies.setScanMovies([]);
    setStep(1);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setLibraryPath("");
    scanMovies.setScanMovies([]);
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stepText[step]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {step === 1 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Label htmlFor="library" className="text-sm font-medium" />
                <Input
                  id="library"
                  value={libraryPath}
                  onChange={(e) => setLibraryPath(e.target.value)}
                  placeholder="Enter movie folder path"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleNextFromStep1}
                  disabled={scanMovies.isPending}
                >
                  {scanMovies.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
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
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={scanMovies.scanMovies.length === 0}
                >
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-2 grid gap-2">
                    <Label htmlFor="cacheCapacityDesktop">Capacity</Label>
                    <p className="text-xs text-muted-foreground">
                      Max cache capacity for transcoding, Default: 50 GB
                    </p>
                    <Input
                      id="cacheCapacityDesktop"
                      type="number"
                      placeholder="e.g. 50"
                      min={1}
                      value={capacityValue}
                      onChange={(e) => setCapacityValue(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Unit</Label>

                    <Select
                      defaultValue={capacityUnit}
                      onValueChange={(v) => setCapacityUnit(v as "GB" | "TB")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GB">GB</SelectItem>
                        <SelectItem value="TB">TB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddFolder() {
  const [open, setOpen] = useState(false);
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
              <Button variant="ghost" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Folder</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <AddFolderDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
