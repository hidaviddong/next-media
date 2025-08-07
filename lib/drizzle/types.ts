import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  user,
  session,
  account,
  verification,
  userPaths,
  movieFolders,
  movies,
  processingTasks,
} from "./schema";

// User types
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

// Session types
export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;

// Account types
export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;

// Verification types
export type Verification = InferSelectModel<typeof verification>;
export type NewVerification = InferInsertModel<typeof verification>;

// User Paths types
export type UserPath = InferSelectModel<typeof userPaths>;
export type NewUserPath = InferInsertModel<typeof userPaths>;

// Movie Folders types
export type MovieFolder = InferSelectModel<typeof movieFolders>;
export type NewMovieFolder = InferInsertModel<typeof movieFolders>;

// Movies types
export type Movie = InferSelectModel<typeof movies>;
export type NewMovie = InferInsertModel<typeof movies>;

// Processing Tasks types
export type ProcessingTask = InferSelectModel<typeof processingTasks>;
export type NewProcessingTask = InferInsertModel<typeof processingTasks>;

// Extended types with relations
export type MovieFolderWithMovie = MovieFolder & {
  movie?: Movie;
};

export type UserPathWithFolders = UserPath & {
  movieFolders: MovieFolderWithMovie[];
};

export type ProcessingTaskWithDetails = ProcessingTask & {
  userPath: UserPath;
};
