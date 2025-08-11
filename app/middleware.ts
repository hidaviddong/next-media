import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  console.log("Hello World");
  //   const session = await auth.api.getSession({
  //     headers: await headers(),
  //   });

  //   if (!session) {
  //     return NextResponse.redirect(new URL("/sign-in", request.url));
  //   }
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/api/:path*"], // Apply middleware to specific routes
};
