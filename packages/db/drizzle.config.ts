import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  out: "./src/drizzle",
  schema: "./src/schema.ts",
  dbCredentials: {
    url: "./local.db",
  },
});
