import { auth } from "@next-media/api/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sign from "./sign";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  console.log("sessions", session);
  if (session) {
    redirect("/movies");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Sign />
      </div>
    </div>
  );
}
