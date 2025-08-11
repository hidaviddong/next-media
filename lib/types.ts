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

export interface TmdbApiRequestJob {
  userId: string;
  libraryPath: string; // 库的根路径, e.g., "/data/movies"
  folderName: string; // 这部电影的原始文件夹名, e.g., "The Matrix 1999"
  movieTitle: string; // 从文件夹名解析出的电影标题
  year: string; // 从文件夹名解析出的年份
}

export interface TmdbMovieResponse {
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}
