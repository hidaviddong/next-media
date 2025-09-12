import {
  useMovieByTmdbId,
  useMovieStatus,
  useUpdateCacheItem,
  useUserLibrary,
} from "@/integrations/tanstack-query/query";
import { TMDB_IMAGE_BASE_URL } from "@next-media/configs/constant";
import { AspectRatio } from "@next-media/ui/aspect-ratio.tsx";
import { Button } from "@next-media/ui/button.tsx";
import { Progress } from "@next-media/ui/progress.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@next-media/ui/tooltip.tsx";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, MoveLeftIcon, Play } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useEffect } from "react";
import { MoviePlayer } from "./movie-player";

export function MovieDetail({ tmdbId }: { tmdbId: string }) {
  const [playing, setPlaying] = useQueryState(
    "playing",
    parseAsBoolean.withDefault(false)
  );
  const queryClient = useQueryClient();

  const { movieByTmdbIdQuery } = useMovieByTmdbId(tmdbId);
  const { movieStatusQuery } = useMovieStatus(tmdbId);
  const { updateCacheItemMutation } = useUpdateCacheItem();
  const { userLibraryQuery } = useUserLibrary();

  const movieRecord = movieByTmdbIdQuery.data?.movie;
  const movieStatus = movieStatusQuery.data;
  const libraryId = userLibraryQuery.data?.userLibrary?.id ?? "";

  // 动态更新页面head信息
  useEffect(() => {
    if (movieRecord) {
      const title = `${movieRecord.name} (${movieRecord.year}) - NextMedia`;
      const description =
        movieRecord.overview || `Watch ${movieRecord.name} on NextMedia`;
      const imageUrl = movieRecord.poster
        ? `${TMDB_IMAGE_BASE_URL}${movieRecord.poster}`
        : "/logo192.png";

      // 更新页面标题
      document.title = title;

      // 更新favicon为电影海报
      const updateFavicon = (imageUrl: string) => {
        // 移除现有的favicon链接
        const existingFavicon = document.querySelector(
          'link[rel="icon"]'
        ) as HTMLLinkElement;
        if (existingFavicon) {
          existingFavicon.remove();
        }

        // 创建新的favicon链接
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/png";
        favicon.href = imageUrl;
        document.head.appendChild(favicon);

        // 同时更新apple-touch-icon
        const existingAppleIcon = document.querySelector(
          'link[rel="apple-touch-icon"]'
        ) as HTMLLinkElement;
        if (existingAppleIcon) {
          existingAppleIcon.remove();
        }

        const appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        appleIcon.href = imageUrl;
        document.head.appendChild(appleIcon);
      };

      // 更新favicon
      updateFavicon(imageUrl);

      // 更新或创建meta标签
      const updateMetaTag = (
        property: string,
        content: string,
        isProperty = false
      ) => {
        const selector = isProperty
          ? `meta[property="${property}"]`
          : `meta[name="${property}"]`;
        let meta = document.querySelector(selector) as HTMLMetaElement;

        if (!meta) {
          meta = document.createElement("meta");
          if (isProperty) {
            meta.setAttribute("property", property);
          } else {
            meta.setAttribute("name", property);
          }
          document.head.appendChild(meta);
        }
        meta.setAttribute("content", content);
      };

      // 更新所有相关的meta标签
      updateMetaTag("description", description);
      updateMetaTag("og:title", title, true);
      updateMetaTag("og:description", description, true);
      updateMetaTag("og:image", imageUrl, true);
      updateMetaTag("og:image:width", "500", true);
      updateMetaTag("og:image:height", "750", true);
      updateMetaTag("og:type", "video.movie", true);
      updateMetaTag("twitter:card", "summary_large_image");
      updateMetaTag("twitter:title", title);
      updateMetaTag("twitter:description", description);
      updateMetaTag("twitter:image", imageUrl);
      updateMetaTag("apple-mobile-web-app-title", movieRecord.name);
    }

    // 清理函数：当组件卸载时恢复默认favicon
    return () => {
      // 恢复默认favicon
      const existingFavicon = document.querySelector(
        'link[rel="icon"]'
      ) as HTMLLinkElement;
      if (existingFavicon) {
        existingFavicon.remove();
      }

      const defaultFavicon = document.createElement("link");
      defaultFavicon.rel = "icon";
      defaultFavicon.href = "/favicon.ico";
      document.head.appendChild(defaultFavicon);

      // 恢复默认apple-touch-icon
      const existingAppleIcon = document.querySelector(
        'link[rel="apple-touch-icon"]'
      ) as HTMLLinkElement;
      if (existingAppleIcon) {
        existingAppleIcon.remove();
      }

      const defaultAppleIcon = document.createElement("link");
      defaultAppleIcon.rel = "apple-touch-icon";
      defaultAppleIcon.href = "/logo192.png";
      document.head.appendChild(defaultAppleIcon);
    };
  }, [movieRecord]);

  return (
    <div className="py-8">
      {playing && (
        <div className="mb-6">
          <div
            className="w-8 h-8 rounded-md overflow-hidden cursor-pointer"
            onClick={() => setPlaying(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPlaying(false);
              }
            }}
          >
            {movieRecord?.poster && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoveLeftIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{movieRecord.name}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {playing ? (
        <div className="flex justify-center items-center min-h-[60vh] lg:min-h-0">
          {movieStatus && movieRecord?.poster && (
            <div className="w-full max-w-4xl mx-auto px-4">
              <MoviePlayer
                movieStatus={movieStatus}
                posterPath={movieRecord.poster}
                movieId={movieRecord.id}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="lg:col-span-1">
            <div className="w-full max-w-48 sm:max-w-xs lg:max-w-sm mx-auto lg:mx-0">
              <div className="rounded-lg overflow-hidden shadow-lg border border-neutral-200">
                <AspectRatio ratio={2 / 3}>
                  {movieRecord?.poster && (
                    <img
                      src={`${TMDB_IMAGE_BASE_URL}${movieRecord.poster}`}
                      alt={`Poster for ${movieRecord.name}`}
                      className="object-cover"
                    />
                  )}
                </AspectRatio>
              </div>
            </div>
          </div>

          {/* Movie Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-neutral-900 leading-tight">
                {movieRecord?.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-neutral-600">
                {movieRecord?.year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{movieRecord.year}</span>
                  </div>
                )}
              </div>

              {movieRecord?.overview && (
                <p className="text-base sm:text-lg text-neutral-700 leading-relaxed max-w-3xl">
                  {movieRecord.overview}
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      className="flex cursor-pointer"
                      onClick={() => {
                        // 如果没有电影路径
                        if (!movieStatus?.path) {
                          toast.error("Movie path not found");
                          return;
                        }
                        queryClient.invalidateQueries();
                        updateCacheItemMutation.mutate(
                          {
                            movieId: movieRecord?.id ?? "",
                            libraryId,
                          },
                          {
                            onSuccess: () => {
                              setPlaying(true);
                            },
                          }
                        );
                      }}
                    >
                      <Play className="text-neutral-600" />
                      {movieStatus?.progressPercentage ? (
                        <Progress
                          value={movieStatus?.progressPercentage}
                          className="w-12"
                        />
                      ) : (
                        <></>
                      )}

                      {movieStatus?.leftTimeMinutes ? (
                        <p className="text-sm text-neutral-600">
                          {movieStatus?.leftTimeMinutes} min
                        </p>
                      ) : (
                        <></>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{movieStatus?.path}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
