import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  dialect: "sqlite",
  out: "./src/drizzle",
  schema: "./src/schema.ts",
  dbCredentials: {
    url: join(__dirname, "./local.db"),
  },
});
