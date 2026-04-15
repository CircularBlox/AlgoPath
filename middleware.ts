import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAIL } from "~/lib/is-admin";
import { createMiddlewareClient } from "~/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/auth"];
// Auth pages that logged-in users shouldn't revisit
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/signup"];
// Pages only the admin account can visit
const ADMIN_PAGE_PATHS = ["/add-hints", "/add-solution"];
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
  const { supabase, response } = createMiddlewareClient(request);

  // Refresh session — required for SSR auth to stay valid
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
