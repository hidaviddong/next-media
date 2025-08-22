import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@next-media/db/db";
import * as schema from "@next-media/db/schema";

const APP_BASE_URL = "http://localhost:3000";

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
