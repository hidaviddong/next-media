import { createFileRoute } from "@tanstack/react-router";
import { AddFolder, QueueStatus, SearchCommand } from "../-components";
import { MovieList } from "./-components/movie-list";

export const Route = createFileRoute("/movies/")({
  component: Movies,
});

function Movies() {
  return (
    <div className="flex flex-col gap-4">
      <AddFolder />
      <SearchCommand />
      <QueueStatus />
      <MovieList />
    </div>
  );
}
