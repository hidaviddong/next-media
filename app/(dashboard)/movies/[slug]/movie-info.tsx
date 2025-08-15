"use client";
import { useMovieInfo } from "../hooks";
import {
  AudioWaveform,
  Gauge,
  HardDrive,
  Replace,
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

export default function MovieInfo({ moviePath }: { moviePath: string }) {
  const { movieInfoQuery } = useMovieInfo(moviePath);
  const isTranscoded = movieInfoQuery.data?.isTranscoded;
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={`flex items-center gap-1.5 py-1 ${
                  isTranscoded
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                }`}
              >
                {isTranscoded ? (
                  <Replace className="w-3.5 h-3.5" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>{isTranscoded ? "Remuxed" : "Direct Play"}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isTranscoded
                  ? "The original file has been remuxed to MP4 format"
                  : "Your device natively supports this file format"}
              </p>
            </TooltipContent>
          </Tooltip>

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
