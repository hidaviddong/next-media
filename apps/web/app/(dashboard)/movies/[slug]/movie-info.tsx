"use client";
import { useMovieInfo } from "../hooks";
import {
  AudioWaveform,
  Gauge,
  HardDrive,
  Replace,
  ServerCog,
  Video,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBitrate, formatSize } from "@/lib/utils";

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

export default function MovieInfo({ moviePath }: { moviePath: string }) {
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
  const displayInfo = {
    size: format.size ? formatSize(format.size) : null,
    bitrate: format.bit_rate ? formatBitrate(format.bit_rate) : null,
    container: format.format_name?.split(",")[0],

    // 视频信息
    resolution: videoStream
      ? `${videoStream.width}x${videoStream.height}`
      : null,
    videoCodec: videoStream ? videoStream.codec_name?.toUpperCase() : null,

    // 音频信息
    audioCodec: audioStream ? audioStream.codec_name?.toUpperCase() : null,
    audioChannels: audioStream ? `${audioStream.channels}ch` : null,
  };

  const isMovieInfoLoading = movieInfoQuery.isLoading;
  return (
    <div className="mt-4 flex items-center justify-start flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
      {isMovieInfoLoading && (
        <div className="h-6 bg-gray-200 rounded-md dark:bg-gray-700 animate-pulse w-full max-w-md"></div>
      )}

      {displayInfo && (
        <TooltipProvider delayDuration={150}>
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
