"use client";

import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type MovieStatus = "pending" | "success" | "failed";

export interface MovieWithStatus {
  id: string;
  name: string;
  year?: string;
  status: MovieStatus;
  errorMessage?: string;
}

interface MovieStatusListProps {
  movies: MovieWithStatus[];
}

export default function MovieStatusList({ movies }: MovieStatusListProps) {
  const getStatusIcon = (status: MovieStatus) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: MovieStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
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

  if (movies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No movies added yet. Click "Add Folder" to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Movie Processing Status</h3>
      <div className="space-y-2">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(movie.status)}
              <div>
                <div className="font-medium">
                  {movie.name}
                  {movie.year && (
                    <span className="text-muted-foreground ml-2">
                      ({movie.year})
                    </span>
                  )}
                </div>
                {movie.errorMessage && (
                  <div className="text-sm text-red-500 mt-1">
                    {movie.errorMessage}
                  </div>
                )}
              </div>
            </div>
            {getStatusBadge(movie.status)}
          </div>
        ))}
      </div>
    </div>
  );
}
