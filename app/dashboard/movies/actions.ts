"use server";

import { auth } from "@/lib/auth";
import { BadRequestError, UnauthorizedError } from "@/lib/error";
import { headers } from "next/headers";
import fs from "node:fs/promises";
import path from "node:path";

type ActionState = {
  error?: string;
  values: { folder: string };
  movies?: Array<{ name: string; year?: string }>;
};

function parseMovieName(folder: string) {
  let name = folder.trim();
  if (!name) {
    throw new BadRequestError("Folder name is required");
  }
  let year;
  const nameMatch = name.match(/^(.*?)\s*\((\d{4})\)$/);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1];
    year = nameMatch[2];
  }
  return {
    name,
    ...(year && { year }),
  };
}

export async function parseMoviesFolder(
  initialState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const folder = String(formData.get("folder") || "");
  const values = { folder };

  // Simple validation
  if (!folder.trim()) {
    return { values, error: "Folder path is required" };
  }

  if (folder.length > 260) {
    return { values, error: "Path length cannot exceed 260 characters" };
  }

  try {
    // Verify user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      throw new UnauthorizedError();
    }

    // Process folder
    const entries = await fs.readdir(folder, { withFileTypes: true });
    const movieFolders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(folder, entry.name));

    const movies = [];
    for (const movieFolder of movieFolders) {
      const movieName = parseMovieName(path.basename(movieFolder));
      movies.push(movieName);
    }

    return {
      values,
      movies,
    };
  } catch (error) {
    let errorMessage = "Failed to parse movies folder";

    if (
      error instanceof BadRequestError ||
      error instanceof UnauthorizedError
    ) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      values,
      error: errorMessage,
    };
  }
}
