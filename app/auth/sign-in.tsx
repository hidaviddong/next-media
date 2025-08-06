"use client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useSetAtom } from "jotai";
import { isSignUpAtom } from "@/lib/store";

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
  const setIsSignUp = useSetAtom(isSignUpAtom);
  const signInMutation = useMutation({
    mutationFn: async (values: SignInFormValues) => {
      return await authClient.signIn.email(
        {
          email: values.email,
          password: values.password,
          rememberMe: true,
          callbackURL: "http://localhost:3000",
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
                      <Input id="password" type="password" {...field} />
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
          <Button
            type="button"
            variant="link"
            className="p-0 underline underline-offset-4"
            onClick={() => setIsSignUp(true)}
          >
            Sign up
          </Button>
        </div>
      </form>
    </Form>
  );
}
