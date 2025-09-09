import MovieHeader from "./-components/-movie-header";
import MovieLists from "./-components/movie-lists";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/movies/")({
  component: App,
});

function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MovieHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <MovieLists />
      </main>
    </div>
  );
}
