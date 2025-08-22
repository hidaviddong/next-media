export interface TmdbApiRequestJob {
  userId: string;
  libraryPath: string; // 库的根路径, e.g., "/data/movies"
  filePath: string; // 这部电影的原始文件夹名, e.g., "The Matrix 1999"
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

export interface RemuxToMp4Job {
  inputPath: string;
  outputPath: string;
}

export interface HlsJob {
  inputPath: string;
  outputPath: string;
}

export interface MovieInfo {
  streams: Record<string, any>[];
  format: Record<string, any>;
}

export interface SubtitleTrackInfo {
  type: "embedded" | "external"; // 字幕来源：内封还是外部文件
  index?: number; // 如果是内封字幕，它的流索引
  lang?: string; // 语言代码 (e.g., "chi", "eng")
  title?: string; // 标题/描述 (e.g., "简体中文", "English SDH")
  path?: string; // 如果是外部文件，它的路径
}

export type MovieType = "direct" | "remux" | "hls";
