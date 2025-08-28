"use client";
import Hls from "hls.js";
import { TMDB_IMAGE_BASE_URL } from "@/lib/constant";
import { toast } from "sonner";
import MovieInfo from "./movie-info";
import {
  useMovieInfo,
  useMovieRemux,
  useMovieSubtitleLists,
  useMovieRemuxProgress,
  useMovieHls,
  useMovieHlsProgress,
  useMoviePlayHistory,
  useUserLibrary,
} from "../hooks";
import { useEffect, useRef } from "react";
import { getDirname, getSubtitleSrc } from "@/lib/utils";
import { MovieProgress } from "./movie-progress";
import { useQueryState } from "nuqs";
import type { MovieStatusResponseType } from "@/lib/types";

export default function MoviePlayer({
  movieStatus,
  posterPath,
  movieId,
}: {
  movieStatus: MovieStatusResponseType;
  posterPath: string;
  movieId: string;
}) {
  const { userLibraryQuery } = useUserLibrary();
  const libraryId = userLibraryQuery.data?.userLibrary?.id ?? "";

  const userAgent = navigator.userAgent;
  const isSafari =
    userAgent.includes("Safari") && !userAgent.includes("Chrome");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // movie info
  const { movieInfoQuery } = useMovieInfo(movieStatus.path);
  const movieType = movieInfoQuery.data?.type;
  // subtitls
  const { movieSubtitleListsQuery } = useMovieSubtitleLists(movieStatus.path);
  const movieSubtitleLists = movieSubtitleListsQuery.data;
  // remux
  const { movieRemuxQuery } = useMovieRemux(
    movieStatus.path,
    libraryId,
    movieId,
    movieType
  );
  const remuxJobId = movieRemuxQuery.data?.jobId;
  const { movieRemuxProgressQuery } = useMovieRemuxProgress(
    remuxJobId,
    movieStatus.path
  );
  const remuxProgress = movieRemuxProgressQuery.data?.progress;
  const remuxOutputPath = movieRemuxQuery.data?.outputPath;

  // hls
  const { movieHlsQuery } = useMovieHls(
    movieStatus.path,
    libraryId,
    movieId,
    movieType
  );
  const hlsJobId = movieHlsQuery.data?.jobId;
  const { movieHlsProgressQuery } = useMovieHlsProgress(
    hlsJobId,
    movieStatus.path
  );
  const hlsProgress = movieHlsProgressQuery.data?.progress;
  const hlsOutputPath = movieHlsQuery.data?.outputPath;

  const { moviePlayHistoryMutation } = useMoviePlayHistory();
  const [playing] = useQueryState("playing");
  const hasJumpedToInitialProgress = useRef(false);

  useEffect(() => {
    if (!playing) {
      const currentTime = videoRef.current?.currentTime ?? 0;
      const duration = videoRef.current?.duration ?? 0;
      if (movieId && duration > 0 && currentTime > 0) {
        moviePlayHistoryMutation.mutate({
          movieId,
          progress: currentTime,
          totalTime: duration,
        });
      }
    }
  }, [playing]);

  useEffect(() => {
    // 获取 video 元素的稳定引用
    const videoElement = videoRef.current;

    if (videoElement && movieType) {
      // 1. 定义事件处理函数
      const handleMetadataLoaded = () => {
        // 检查是否有有效的进度，并且我们还没有执行过跳转
        if (movieStatus.progress > 0 && !hasJumpedToInitialProgress.current) {
          // 再次检查确保要跳转的时间点在视频总时长之内
          if (movieStatus.progress < videoElement.duration) {
            console.log(
              `Media metadata loaded, jump to: ${movieStatus.progress} seconds`
            );
            videoElement.currentTime = movieStatus.progress;
          }
          // 标记为已跳转，防止重复执行
          hasJumpedToInitialProgress.current = true;
        }
      };

      videoElement.addEventListener("loadedmetadata", handleMetadataLoaded);

      if (videoRef.current && movieType) {
        switch (movieType) {
          case "direct":
            videoRef.current.src = `/api/movie/directPlay?moviePath=${encodeURIComponent(
              movieStatus.path
            )}`;
            break;
          case "remux":
            if (remuxProgress === 100) {
              videoRef.current.src = `/api/movie/directPlay?moviePath=${encodeURIComponent(
                getDirname(remuxOutputPath)
              )}`;
            }
            break;
          case "hls":
            if (hlsProgress === 100 && hlsOutputPath) {
              const hlsSource = `/api/movie/hlsPlay?filename=output.m3u8&moviePath=${encodeURIComponent(
                hlsOutputPath
              )}`;
              if (isSafari) {
                videoRef.current.src = hlsSource;
              } else {
                if (Hls.isSupported()) {
                  if (!hlsRef.current) {
                    hlsRef.current = new Hls();
                    hlsRef.current.on(Hls.Events.ERROR, function (event, data) {
                      console.error("HLS.js Error:", data);
                      if (data.fatal) {
                        switch (data.type) {
                          case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error(
                              "Fatal network error encountered",
                              data
                            );
                            hlsRef.current?.startLoad();
                            break;
                          case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error(
                              "Fatal media error encountered",
                              data
                            );
                            hlsRef.current?.recoverMediaError();
                            break;
                          default:
                            console.error(
                              "An unrecoverable error occurred",
                              data
                            );
                            hlsRef.current?.destroy();
                            break;
                        }
                      }
                    });
                  }
                  hlsRef.current.loadSource(hlsSource);
                  hlsRef.current.attachMedia(videoRef.current);
                } else if (
                  videoRef.current.canPlayType("application/vnd.apple.mpegurl")
                ) {
                  videoRef.current.src = hlsSource;
                } else {
                  toast.error("Your browser does not support HLS.");
                }
              }
            }
            break;
        }
      }

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        if (videoElement) {
          videoElement.removeEventListener(
            "loadedmetadata",
            handleMetadataLoaded
          );
        }
      };
    }
  }, [
    movieStatus.path,
    movieType,
    remuxProgress,
    hlsProgress,
    remuxOutputPath,
    hlsOutputPath,
    movieId,
  ]);

  if (remuxProgress < 100) {
    return (
      <MovieProgress
        progress={remuxProgress}
        poster={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
      />
    );
  }

  if (hlsProgress < 100) {
    return (
      <MovieProgress
        progress={hlsProgress}
        poster={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
      />
    );
  }

  return (
    <div className="w-full mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          controls
          className="w-full h-full object-contain"
          onError={(e) => {
            toast.error(e.currentTarget.error?.message);
          }}
          poster={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
        >
          {movieSubtitleLists &&
            movieSubtitleLists.map((track, i) => (
              <track
                key={
                  track.type === "embedded"
                    ? `embed-${track.index}`
                    : `ext-${track.path}`
                }
                src={getSubtitleSrc(movieStatus.path, track)}
                kind="subtitles"
                srcLang={track.lang || "und"}
                label={track.title || `Subtitle ${i + 1}`}
                default={i === 0}
              />
            ))}
          Your browser does not support the video tag.
        </video>
      </div>

      <MovieInfo moviePath={movieStatus.path} />
    </div>
  );
}
