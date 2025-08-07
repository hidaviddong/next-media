import { auth } from "@/lib/auth";
import { db, userPaths, movieFolders, movies } from "@/lib/drizzle";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import AddFolderButton from "./add-folder-button";
import MovieGrid from "./movie-grid";
import { headers } from "next/headers";

export default async function MoviesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/auth");
  }

  const userId = session.user.id;

  // 获取用户所有路径下的电影数据
  const userPathsData = await db
    .select()
    .from(userPaths)
    .where(and(eq(userPaths.userId, userId), eq(userPaths.isActive, true)));

  const moviesData = [];

  for (const pathData of userPathsData) {
    const folders = await db
      .select()
      .from(movieFolders)
      .where(eq(movieFolders.userPathId, pathData.id));

    const foldersWithMovies = await Promise.all(
      folders.map(async (folder) => {
        const movie = await db
          .select()
          .from(movies)
          .where(eq(movies.movieFolderId, folder.id)) // 使用 folder.id 而不是 folder.folderName
          .then((res) => res[0]);

        return {
          id: folder.id,
          name: folder.parsedName,
          year: folder.parsedYear,
          status: folder.status,
          errorMessage: folder.errorMessage,
          retryCount: folder.retryCount,
          folderPath: folder.folderPath,
          // 电影详细信息
          title: movie?.title,
          overview: movie?.overview,
          poster: movie?.poster,
        };
      })
    );

    moviesData.push(...foldersWithMovies);
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

      {/* Movie Grid */}
      {/* <MovieGrid movies={moviesData} /> */}
    </>
  );
}
