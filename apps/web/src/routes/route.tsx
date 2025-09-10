import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@next-media/auth/client";
import Header from "./-components/header";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/signin" });
    } else {
      throw redirect({ to: "/movies" });
    }
  },
  component: LayoutComponent,
});

export default function LayoutComponent() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
