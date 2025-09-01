"use client";
import { useMovieInfo, useMovieLists } from "../hooks";
import {
  AudioWaveform,
  Gauge,
  HardDrive,
  Replace,
  ServerCog,
  Video,
  Zap,
  Captions,
} from "lucide-react";
import { Badge } from "@next-media/ui/badge.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@next-media/ui/tooltip.tsx";
import MovieChat from "./movie-chat";

function formatSize(bytes: number = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatBitrate(bits: number = 0) {
  if (bits === 0) return "0 bps";
  const k = 1000;
  const sizes = ["bps", "kbps", "Mbps", "Gbps"];
  const i = Math.floor(Math.log(bits) / Math.log(k));
  return parseFloat((bits / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const playbackTypeConfig = {
  direct: {
    Icon: Zap,
    text: "Direct Play",
    tooltip: "Your device natively supports this file's format and codecs.",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  remux: {
    Icon: Replace,
    text: "Remux",
    tooltip:
      "The original file container is being remuxed to MP4 in real-time.",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  hls: {
    Icon: ServerCog,
    text: "Transcode (HLS)",
    tooltip:
      "The file's codecs are incompatible and are being transcoded in real-time.",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
};

export default function MovieInfo({
  moviePath,
  videoRef,
}: {
  moviePath: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const { movieListsQuery } = useMovieLists();
  const currentMovie = movieListsQuery.data?.find(
    (m) => m.path === moviePath
  )?.movie;
  const { movieInfoQuery } = useMovieInfo(moviePath);
  const movieType = movieInfoQuery.data?.type;

  const currentTypeInfo =
    playbackTypeConfig[movieType as keyof typeof playbackTypeConfig];

  const movieInfo = movieInfoQuery.data?.movieInfo;
  if (!movieInfo) {
    return <></>;
  }
  const { format, streams } = movieInfo;
  const videoStream = streams.find((s) => s.codec_type === "video");
  const audioStream = streams.find((s) => s.codec_type === "audio");
  const subtitleStreams = streams.filter((s) => s.codec_type === "subtitle");
  const displayInfo = {
    size: format.size ? formatSize(parseInt(format.size)) : null,
    bitrate: format.bit_rate ? formatBitrate(parseInt(format.bit_rate)) : null,
    container: format.format_name?.split(",")[0],

    // 视频信息
    resolution: videoStream
      ? `${videoStream.width}x${videoStream.height}`
      : null,
    videoCodec: videoStream ? videoStream.codec_name?.toUpperCase() : null,

    // 音频信息
    audioCodec: audioStream ? audioStream.codec_name?.toUpperCase() : null,
    audioChannels: audioStream ? `${audioStream.channels}ch` : null,

    // 字幕信息
    subtitleCount: subtitleStreams.length,
    subtitleLanguages: subtitleStreams
      .map((s) => s.tags?.title || s.tags?.language?.toUpperCase())
      .filter(Boolean) as string[],
  };

  const isMovieInfoLoading = movieInfoQuery.isLoading;
  return (
    <div className="mt-4 flex items-center justify-start flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
      {isMovieInfoLoading && (
        <div className="h-6 bg-gray-200 rounded-md dark:bg-gray-700 animate-pulse w-full max-w-md"></div>
      )}

      {displayInfo && (
        <TooltipProvider delayDuration={150}>
          {/* 无字幕的话，AI无法感知上下文 */}
          {displayInfo.subtitleCount > 0 && (
            <MovieChat
              movieContext={{
                name: currentMovie?.name ?? "",
                overview: currentMovie?.overview ?? "",
                subtitleIndex: subtitleStreams[0].index, // 默认用第一条字幕索引
                movieFolderPath: moviePath,
              }}
              videoRef={videoRef}
            />
          )}

          {currentTypeInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={`flex items-center gap-1.5 py-1 ${currentTypeInfo.className}`}
                >
                  <currentTypeInfo.Icon className="w-3.5 h-3.5" />
                  <span>{currentTypeInfo.text}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTypeInfo.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* 分辨率 */}
          {displayInfo.resolution && (
            <Badge variant="outline" className="flex items-center gap-1.5 py-1">
              <Video className="w-3.5 h-3.5" />
              <span>{displayInfo.resolution}</span>
            </Badge>
          )}

          {/* 音频 */}
          {displayInfo.audioCodec && (
            <Badge variant="outline" className="flex items-center gap-1.5 py-1">
              <AudioWaveform className="w-3.5 h-3.5" />
              <span>{displayInfo.audioCodec}</span>
              {displayInfo.audioChannels && (
                <span>{displayInfo.audioChannels}</span>
              )}
            </Badge>
          )}

          {/* 字幕 */}
          {displayInfo.subtitleCount > 0 && (
            <Badge variant="outline" className="flex items-center gap-1.5 py-1">
              <Captions className="w-3.5 h-3.5" />
              <span>
                {displayInfo.subtitleLanguages.length > 0
                  ? `${displayInfo.subtitleLanguages.join(", ")}`
                  : `${displayInfo.subtitleCount} Subtitle${
                      displayInfo.subtitleCount > 1 ? "s" : ""
                    }`}
              </span>
            </Badge>
          )}

          {/* 视频编码和容器 */}
          {displayInfo.videoCodec && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-default py-1">
                  {`${
                    displayInfo.videoCodec
                  } in ${displayInfo.container?.toUpperCase()}`}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Video Codec: {displayInfo.videoCodec}</p>
                <p>Container Format: {displayInfo.container?.toUpperCase()}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* 文件大小 */}
          {displayInfo.size && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{displayInfo.size}</span>
            </div>
          )}

          {/* 总码率 */}
          {displayInfo.bitrate && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Gauge className="w-3.5 h-3.5" />
              <span>{displayInfo.bitrate}</span>
            </div>
          )}
        </TooltipProvider>
      )}
    </div>
  );
}
