import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  dialect: "sqlite",
  schema: "./dist/src/schema.js",
  dbCredentials: {
    url: join(__dirname, "./local.db"),
  },
});
