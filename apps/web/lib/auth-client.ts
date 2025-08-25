import { createAuthClient } from "better-auth/react";
import { API_BASE_URL } from "@next-media/constants";

export const authClient = createAuthClient({
  //you can pass client configuration here
  baseURL: API_BASE_URL,
});
