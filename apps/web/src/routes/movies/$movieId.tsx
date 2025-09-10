import { createFileRoute } from "@tanstack/react-router";
import { MovieDetail } from "./-components/movie-detail";

export const Route = createFileRoute("/movies/$movieId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { movieId } = Route.useParams();
  return <MovieDetail movieId={movieId} />;
}
