import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import { resolveSync, fileURLToPath } from "mlly";

const dbPath = resolveSync("../local.db", { url: import.meta.url });
const filePath = fileURLToPath(dbPath);
const sqlite = new Database(filePath);
export const db = drizzle(sqlite, { schema });
