import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAIL } from "~/lib/is-admin";
import { createMiddlewareClient } from "~/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/auth", "/display-problem", "/changelog"];
// Auth pages that logged-in users shouldn't revisit
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/signup"];
// Pages only the admin account can visit
const ADMIN_PAGE_PATHS = ["/add-hints", "/add-solution", "/admin"];
// API routes only the admin account can call
const ADMIN_API_PATHS = ["/api/admin"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAdminPage(pathname: string) {
  return ADMIN_PAGE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAdminApi(pathname: string) {
  return ADMIN_API_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  // RSC payload requests are same-origin fetches made by the Next.js router
  // after the initial navigation has already enforced auth. Running
  // supabase.auth.getUser() here mutates session cookies, which signals
  // Next.js to invalidate the RSC cache and issue another fetch — causing
  // a cascade. Early-return to avoid it.
  if (request.headers.get("RSC") === "1") {
    return NextResponse.next();
  }

  // Sentry tunnel route — must be publicly accessible so error reports
  // aren't blocked for unauthenticated users or before auth resolves.
  if (request.nextUrl.pathname === "/monitoring") {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);

  // Refresh session — required for SSR auth to stay valid.
  // auth-js throws (not returns) when the refresh token is stale/revoked.
  // Catch it, clear the dead cookies, and fall through as unauthenticated.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (err) {
    Sentry.captureException(err, { tags: { source: "middleware_auth" } });
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.delete(cookie.name);
      }
    }
  }

  if (user) {
    Sentry.setUser({ id: user.id, email: user.email ?? undefined });
  } else {
    Sentry.setUser(null);
  }

  const { pathname } = request.nextUrl;

  // Block non-admin access to admin API routes (return JSON 403)
  if (isAdminApi(pathname)) {
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return response;
  }

  // Block non-admin access to admin pages (redirect)
  if (isAdminPage(pathname)) {
    if (!user || user.email !== ADMIN_EMAIL) {
      const url = request.nextUrl.clone();
      url.pathname = user ? "/" : "/auth/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Redirect authenticated users away from login/signup
  if (user && AUTH_ONLY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/display-problem";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // API routes handle their own auth and return JSON — never redirect them
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Redirect unauthenticated users away from protected pages
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
