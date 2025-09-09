import { createAuthClient } from "better-auth/react";
import { API_BASE_URL } from "@next-media/configs/constant";

export const authClient = createAuthClient({
  //you can pass client configuration here
  baseURL: API_BASE_URL,
});
