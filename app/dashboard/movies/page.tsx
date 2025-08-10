import AddFolder from "./add-folder";
import QueueStatus from "./queue-status";
import MovieList from "./movie-list";

export default async function MoviesPage() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Movies</h1>
        <p className="text-muted-foreground">Manage your movie collection</p>
        <AddFolder />
        <QueueStatus />
        <MovieList />
      </div>
    </>
  );
}
