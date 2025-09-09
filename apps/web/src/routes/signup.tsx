import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@next-media/ui/card.tsx";
import SignUpComponent from "../components/sign-up";
import { authClient } from "@next-media/auth/client";

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async (_ctx) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/signin",
      });
    }
  },
});

export default function SignUp() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                Enter your information below to create your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpComponent />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
