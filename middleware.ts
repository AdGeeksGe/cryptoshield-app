import { NextRequest, NextResponse } from "next/server";

// Assigns a stable, anonymous visitor ID used as the Statsig `userID`. Keeping
// it server-side (httpOnly cookie) means the same visitor lands in the same
// experiment group across requests, and server-side conversion events can be
// attributed to that exposure. Set on the request too so the first render
// (and the bootstrap in app/layout.tsx) already sees the new ID.
const COOKIE = "statsig_id";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  if (request.cookies.get(COOKIE)) {
    return NextResponse.next();
  }

  const id = crypto.randomUUID();
  request.cookies.set(COOKIE, id);

  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(COOKIE, id, {
    path: "/",
    maxAge: ONE_YEAR,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
