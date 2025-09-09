import { createFileRoute, redirect } from "@tanstack/react-router";
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
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@next-media/auth/client";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

const signUpSchema = z
  .object({
    username: z
      .string()
      .min(2, {
        error: "Username must be at least 2 characters",
      })
      .max(50, {
        error: "Username must be at most 50 characters",
      }),
    email: z.email({
      error: "Invalid email address",
    }),
    password: z.string().min(6, {
      error: "Password must be at least 6 characters",
    }),
    confirmPassword: z.string().min(6, {
      error: "Password must be at least 6 characters",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

export const Route = createFileRoute("/(auth)/signup")({
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
  const navigate = useNavigate({ from: "/signup" });
  const signUpMutation = useMutation({
    mutationFn: async (values: SignUpFormValues) => {
      return await authClient.signUp.email(
        {
          name: values.username,
          email: values.email,
          password: values.password,
        },
        {
          onSuccess: () => {
            navigate({ to: "/" });
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        }
      );
    },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSignUpSubmit(values: SignUpFormValues) {
    signUpMutation.mutate(values);
  }

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
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-3">
                      <FormField
                        control={signUpForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="username">Username</FormLabel>
                            <FormControl>
                              <Input
                                id="username"
                                placeholder="Username"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-3">
                      <FormField
                        control={signUpForm.control}
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
                      <FormField
                        control={signUpForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="password">Password</FormLabel>
                            <FormControl>
                              <Input id="password" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-3">
                      <FormField
                        control={signUpForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="confirmPassword">
                              Confirm Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="confirmPassword"
                                type="password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button
                        type="submit"
                        disabled={signUpMutation.isPending}
                        className="w-full"
                      >
                        {signUpMutation.isPending ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          "Sign Up"
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    Already have an account?{" "}
                    <Link to="/signin">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 underline underline-offset-4"
                      >
                        Sign in
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
