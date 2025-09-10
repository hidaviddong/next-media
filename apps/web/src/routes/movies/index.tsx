import { createFileRoute } from "@tanstack/react-router";
import MovieList from "./-components/movie-list";
import QueueStatus from "../-components/queue-status";
import SearchCommand from "../-components/search-command";
import AddFolder from "../-components/add-folder";

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
