import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@next-media/db/db";
import * as schema from "@next-media/db/schema";
import { APP_BASE_URL, API_BASE_URL } from "@next-media/constants";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [APP_BASE_URL, API_BASE_URL],
  telemetry: {
    enabled: false,
  },
});
