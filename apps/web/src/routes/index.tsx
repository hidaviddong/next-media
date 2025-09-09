import { authClient } from "@next-media/auth/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async (_ctx) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/signin",
      });
    } else {
      throw redirect({
        to: "/movies",
      });
    }
  },
});
