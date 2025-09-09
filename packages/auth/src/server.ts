import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@next-media/db/db";
import { API_BASE_URL, WEB_BASE_URL } from "@next-media/configs/constant";
import * as schema from "@next-media/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [API_BASE_URL, WEB_BASE_URL],
});
