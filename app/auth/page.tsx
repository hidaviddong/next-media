'use client'
import { useState } from "react";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client";

export default function Page({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const { data, error } = await authClient.signUp.email({
        name,
        email,
        password,
        image: "",
        callbackURL: "http://localhost:3000/",
      });
      if (error) {
        setError(error.message || "Sign up failed");
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "http://localhost:3000/",
      });
      if (error) {
        setError(error.message || "Login failed");
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'signup' ? 'Sign up for an account' : 'Login to your account'}</CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? 'Enter your details below to create an account'
              : 'Enter your email and password to login'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === 'signup' ? handleSignUp : handleLogin}>
            <div className="flex flex-col gap-6">
              {mode === 'signup' && (
                <div className="grid gap-3">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? mode === 'signup' ? 'Signing up...' : 'Logging in...'
                    : mode === 'signup' ? 'Sign Up' : 'Login'}
                </Button>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              {success && <div className="text-green-600 text-sm">{mode === 'signup' ? 'Sign up successful!' : 'Login successful!'}</div>}
            </div>
            <div className="mt-4 text-center text-sm">
              {mode === 'signup' ? (
                <>
                  已有账号？{' '}
                  <button
                    type="button"
                    className="underline underline-offset-4 text-blue-600 hover:text-blue-800"
                    onClick={() => { setMode('login'); setError(null); setSuccess(false); }}
                  >
                    去登录
                  </button>
                </>
              ) : (
                <>
                  没有账号？{' '}
                  <button
                    type="button"
                    className="underline underline-offset-4 text-blue-600 hover:text-blue-800"
                    onClick={() => { setMode('signup'); setError(null); setSuccess(false); }}
                  >
                    去注册
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
