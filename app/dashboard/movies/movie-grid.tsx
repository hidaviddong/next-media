"use client";

import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Movie {
  id: string;
  name: string;
  year?: string;
  status: "pending" | "processing" | "success" | "failed";
  errorMessage?: string;
  retryCount: number;
  folderPath: string;
  title?: string;
  overview?: string;
  poster?: string;
}

interface MovieGridProps {
  movies: Movie[];
}

export default function MovieGrid({ movies }: MovieGridProps) {
  const getStatusIcon = (status: Movie["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: Movie["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            Success
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getErrorMessage = (errorMessage?: string) => {
    if (!errorMessage) return null;

    if (errorMessage.includes("Rate limit")) {
      return {
        message: errorMessage,
        suggestion: "This is a temporary issue. Please try again.",
        canRetry: true,
      };
    }

    if (errorMessage.includes("not found")) {
      return {
        message: errorMessage,
        suggestion: "Please check the movie name and year format.",
        canRetry: false,
      };
    }

    if (errorMessage.includes("Network error")) {
      return {
        message: errorMessage,
        suggestion: "Network connection issue. Please try again.",
        canRetry: true,
      };
    }

    return {
      message: errorMessage,
      suggestion: "An unexpected error occurred.",
      canRetry: true,
    };
  };

  const handleRetry = async (movieId: string) => {
    // TODO: 实现重试逻辑
    toast.info("Retry functionality coming soon");
  };

  if (movies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No movies added yet. Click "Add Folder" to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Movie Collection</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {movies.map((movie) => {
          const errorInfo = getErrorMessage(movie.errorMessage);

          return (
            <Card key={movie.id} className="overflow-hidden">
              {/* 电影海报 */}
              {movie.poster && movie.status === "success" && (
                <div className="aspect-[2/3] overflow-hidden">
                  <img
                    src={movie.poster}
                    alt={movie.title || movie.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {getStatusIcon(movie.status)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {movie.title || movie.name}
                      </h4>
                      {movie.year && (
                        <p className="text-xs text-muted-foreground">
                          {movie.year}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(movie.status)}
                </div>

                {/* 电影简介 */}
                {movie.overview && movie.status === "success" && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                    {movie.overview}
                  </p>
                )}

                {/* 错误信息 */}
                {errorInfo && (
                  <div className="mb-3">
                    <div className="text-xs text-red-500 mb-1">
                      {errorInfo.message}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {errorInfo.suggestion}
                    </div>
                  </div>
                )}

                {/* 重试按钮 */}
                {movie.status === "failed" && errorInfo?.canRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(movie.id)}
                    className="w-full"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Retry
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
