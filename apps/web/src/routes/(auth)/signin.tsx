import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@next-media/ui/card.tsx";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@next-media/ui/button.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@next-media/ui/form.tsx";
import { Input } from "@next-media/ui/input.tsx";
import { authClient } from "@next-media/auth/client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { WEB_BASE_URL } from "@next-media/configs/constant";
import { Link } from "@tanstack/react-router";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/signin")({
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

const signInSchema = z.object({
  email: z.email({
    error: "Invalid email address",
  }),
  password: z.string().min(6, {
    error: "Password must be at least 6 characters",
  }),
});
type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignIn() {
  const signInMutation = useMutation({
    mutationFn: async (values: SignInFormValues) => {
      return await authClient.signIn.email(
        {
          email: values.email,
          password: values.password,
          rememberMe: true,
          callbackURL: WEB_BASE_URL,
        },
        {
          onError: (error) => {
            toast.error(error.error.message);
          },
        }
      );
    },
  });

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSignInSubmit(values: SignInFormValues) {
    signInMutation.mutate(values);
  }

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
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(onSignInSubmit)}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-3">
                      <FormField
                        control={signInForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="email">Email</FormLabel>
                            <FormControl>
                              <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-3">
                      <div className="flex items-center">
                        <FormField
                          control={signInForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel htmlFor="password">Password</FormLabel>
                              <FormControl>
                                <Input
                                  id="password"
                                  type="password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button
                        type="submit"
                        disabled={signInMutation.isPending}
                        className="w-full"
                      >
                        {signInMutation.isPending ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link to="/signup">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 underline underline-offset-4"
                      >
                        Sign up
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
