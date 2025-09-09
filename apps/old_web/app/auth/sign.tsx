"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@next-media/ui/card.tsx";
import SignUp from "./sign-up";
import { useAtomValue } from "jotai";
import { isSignUpAtom } from "../../lib/store";
import SignIn from "./sign-in";

export default function Sign() {
  const isSignUp = useAtomValue(isSignUpAtom);
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isSignUp ? "Create an account" : "Login to your account"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Enter your information below to create your account"
              : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>{isSignUp ? <SignUp /> : <SignIn />}</CardContent>
      </Card>
    </div>
  );
}
