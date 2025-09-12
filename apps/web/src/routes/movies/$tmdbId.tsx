import { createFileRoute } from "@tanstack/react-router";
import { MovieDetail } from "./-components/movie-detail";

export const Route = createFileRoute("/movies/$tmdbId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { tmdbId } = Route.useParams();
  return <MovieDetail tmdbId={tmdbId} />;
}
