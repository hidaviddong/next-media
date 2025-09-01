import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@next-media/db/index.ts";
import * as schema from "@next-media/db/schema.ts";
import { APP_BASE_URL } from "./constant";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [APP_BASE_URL],
});
