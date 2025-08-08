import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AddFolderButton from "./add-folder-button";
import { headers } from "next/headers";
import { MovieList } from "./movie-list";
import QueueStatus from "./queue-status";

export default async function MoviesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/auth");
  }
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Movies</h1>
        <p className="text-muted-foreground">Manage your movie collection</p>
      </div>

      <div className="mb-6">
        <AddFolderButton />
      </div>
      <QueueStatus />
      <MovieList />
    </>
  );
}
