import AddFolder from "./add-folder";
import QueueStatus from "./queue-status";
import MovieList from "./movie-lists";

export default async function MoviesPage() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <AddFolder />
        <QueueStatus />
        <MovieList />
      </div>
    </>
  );
}
