import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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

// 用户添加的文件夹路径表
export const userPaths = sqliteTable("user_paths", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  path: text("path").notNull(), // 用户添加的文件夹路径
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// 电影文件夹表 - 存储解析出的电影文件夹信息
export const movieFolders = sqliteTable("movie_folders", {
  id: text("id").primaryKey(),
  userPathId: text("user_path_id")
    .notNull()
    .references(() => userPaths.id, { onDelete: "cascade" }),
  folderName: text("folder_name").notNull(), // 原始文件夹名称
  folderPath: text("folder_path").notNull(), // 完整文件夹路径，用于播放视频
  parsedName: text("parsed_name").notNull(), // 解析后的电影名称
  parsedYear: text("parsed_year"), // 解析后的年份
  status: text("status", {
    enum: ["pending", "processing", "success", "failed"],
  })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"), // 错误信息
  retryCount: integer("retry_count").notNull().default(0), // 重试次数
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// 电影信息表 - 存储从TMDB获取的详细信息
export const movies = sqliteTable("movies", {
  id: integer("id").primaryKey().notNull(),
  title: text("title").notNull(),
  year: text("year").notNull(),
  overview: text("overview").notNull(),
  poster: text("poster").notNull(),
  movieFolderId: text("movie_folder_id")
    .notNull()
    .references(() => movieFolders.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// 处理任务表 - 记录批量处理任务
export const processingTasks = sqliteTable("processing_tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  userPathId: text("user_path_id")
    .notNull()
    .references(() => userPaths.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["running", "completed", "failed"],
  })
    .notNull()
    .default("running"),
  totalFolders: integer("total_folders").notNull().default(0),
  processedFolders: integer("processed_folders").notNull().default(0),
  successfulFolders: integer("successful_folders").notNull().default(0),
  failedFolders: integer("failed_folders").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});
