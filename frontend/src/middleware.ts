import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/verify-phone", "/login/clinician"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("sc_session")?.value;
  const role = request.cookies.get("sc_role")?.value;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/uploads")) {
    return NextResponse.next();
  }

  if (!session && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/signup" || pathname === "/login/clinician")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "DOCTOR" ? "/clinician" : role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/clinician") && role && role !== "DOCTOR" && role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && role && role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = role === "DOCTOR" ? "/clinician" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
