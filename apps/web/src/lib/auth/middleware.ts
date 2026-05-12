/**
 * Next.js middleware auth gate. Reads our session cookie set by the
 * browser auth client and redirects unauthenticated users to /login
 * (and authenticated users away from auth pages). Same exported
 * `updateSession` name as the previous Supabase-backed middleware.
 */

import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "kontafy-access";

export async function updateSession(request: NextRequest) {
  const access_token = request.cookies.get(ACCESS_COOKIE)?.value;
  const isAuthenticated = !!access_token;

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password");

  if (!isAuthenticated && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
