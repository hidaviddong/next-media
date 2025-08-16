import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SubtitleListsResponseType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatSize = (bytes: number = 0) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const formatBitrate = (bits: number = 0) => {
  if (bits === 0) return "0 bps";
  const k = 1000;
  const sizes = ["bps", "kbps", "Mbps", "Gbps"];
  const i = Math.floor(Math.log(bits) / Math.log(k));
  return parseFloat((bits / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getDirname = (path: string) => {
  const lastSlashIndex = path.lastIndexOf("/");
  if (lastSlashIndex === -1) return ".";
  return path.substring(0, lastSlashIndex);
};

export const getSubtitleSrc = (
  moviePath: string,
  track: SubtitleListsResponseType[number]
) => {
  const params = new URLSearchParams({ moviePath });
  if (track.type === "embedded") {
    params.set("index", track.index!.toString());
  } else {
    params.set("externalPath", track.path!);
  }
  return `/api/movie/subtitle?${params.toString()}`;
};
