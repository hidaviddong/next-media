import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@next-media/ui/card.tsx";
import SignInComponent from "../components/sign-in";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@next-media/auth/client";

export const Route = createFileRoute("/signin")({
  component: SignIn,
  beforeLoad: async (_ctx) => {
    const session = await authClient.getSession();
    if (session.data) {
      throw redirect({
        to: "/",
      });
    }
  },
});

export default function SignIn() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInComponent />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
