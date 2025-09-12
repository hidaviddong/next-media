import { createFileRoute } from "@tanstack/react-router";
import { MovieDetail } from "./-components/movie-detail";

export const Route = createFileRoute("/movies/$tmdbId")({
  component: RouteComponent,
  head: () => {
    // 由于head函数在组件渲染前执行，我们无法直接访问queryClient
    // 所以先返回一个基础的head配置，然后在组件中动态更新
    return {
      title: "Movie - NextMedia",
      meta: [
        {
          name: "description",
          content: "Watch movies on NextMedia",
        },
        {
          property: "og:type",
          content: "video.movie",
        },
        {
          name: "apple-mobile-web-app-capable",
          content: "yes",
        },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      ],
    };
  },
});

function RouteComponent() {
  const { tmdbId } = Route.useParams();
  return <MovieDetail tmdbId={tmdbId} />;
}
