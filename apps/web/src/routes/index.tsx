import { authClient } from "@next-media/auth/client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@next-media/ui/button.js";

export const Route = createFileRoute("/")({
  component: App,
  beforeLoad: async (_ctx) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/signin",
      });
    }
  },
});

function App() {
  return (
    <div className="text-center">
      <Button>Hello World</Button>
    </div>
  );
}
