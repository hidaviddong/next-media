import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "packages/db/local.db");
export const db = drizzle(`file:${dbPath}`, { schema });
