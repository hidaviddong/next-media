import { movie } from "@/server/drizzle/schema";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export interface ScanMoviesRequest {
  libraryPath: string;
}

export interface MovieFolder {
  folderName: string;
  name: string;
  year?: string;
}

export interface ScanMoviesResponse {
  data: MovieFolder[];
}

export interface ApiErrorResponse {
  error: string;
}

export type MovieSchema = typeof movie.$inferSelect;

export interface QueueJob {
  id: string;
  movieTitle: string;
  year?: string;
  failedReason?: string;
  timestamp: number;
  libraryPath?: string;
}

export interface QueueData {
  stats: {
    active: number;
    waiting: number;
    failed: number;
    completed: number;
  };
  details: {
    active: QueueJob[];
    waiting: QueueJob[];
    failed: QueueJob[];
    completed: QueueJob[];
  };
}
