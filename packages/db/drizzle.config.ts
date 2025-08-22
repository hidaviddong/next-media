import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const dbFileName = process.env.DB_FILE_NAME!;

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: dbFileName,
  },
});
