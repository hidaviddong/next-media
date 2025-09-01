import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const library = sqliteTable("library", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  maxCacheBytes: integer("max_cache_bytes", { mode: "number" }).default(
    1024 * 1024 * 1024 * 50
  ),
});

export const movie = sqliteTable("movie", {
  id: text("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull().unique(),
  name: text("title").notNull(),
  year: text("year"),
  overview: text("overview"),
  poster: text("poster"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const library_movies = sqliteTable(
  "library_movies",
  {
    libraryId: text("library_id")
      .notNull()
      .references(() => library.id, { onDelete: "cascade" }),
    movieId: text("movie_id")
      .notNull()
      .references(() => movie.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    isWatched: integer("is_watched", { mode: "boolean" }).default(false),
  },
  (t) => [primaryKey({ columns: [t.libraryId, t.movieId] })]
);

export const play_history = sqliteTable("play_history", {
  id: text("id").primaryKey(),
  movieId: text("movie_id")
    .notNull()
    .references(() => movie.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  progress: integer("progress", { mode: "number" }).default(0),
  totalTime: integer("total_time", { mode: "number" }).default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const cache_item = sqliteTable("cache_item", {
  id: text("id").primaryKey(),
  inputPath: text("input_path").notNull().unique(),
  outputPath: text("output_path").notNull().unique(),
  bytes: integer("bytes", { mode: "number" }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  libraryId: text("library_id")
    .notNull()
    .references(() => library.id, { onDelete: "cascade" }),
  movieId: text("movie_id")
    .notNull()
    .references(() => movie.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});
