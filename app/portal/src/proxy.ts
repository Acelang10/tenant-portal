import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: the dashboard still validates the token with the API
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
