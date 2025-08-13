import AppHeader from "@/components/app-header";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={session.user} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
