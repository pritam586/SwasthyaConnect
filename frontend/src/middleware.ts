import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/*
 * Page redirects only (signed-out users to /login, users to their own area). These cookies are
 * not credentials and can be set by anyone; real authorisation happens on the API for every
 * request, so a forged cookie only reaches an empty page that cannot load any data.
 */
const AREAS: Record<string, string> = { "/clinician": "DOCTOR", "/admin": "ADMIN" };
const PATIENT_PATHS = ["/dashboard", "/screening", "/records", "/pharmacies", "/doctors", "/appointments", "/profile"];
const AUTH_PAGES = ["/login", "/signup", "/doctor/login", "/doctor/signup"];

function home(role: string | undefined): string {
  if (role === "DOCTOR") return "/clinician";
  if (role === "ADMIN") return "/admin";
  return "/dashboard";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.get("sc_session")?.value === "1";
  const role = request.cookies.get("sc_role")?.value;
  const redirect = (path: string, withNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = withNext ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  };

  if (AUTH_PAGES.includes(pathname)) {
    return signedIn ? redirect(home(role)) : NextResponse.next();
  }

  const area = Object.keys(AREAS).find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isPatientPath = PATIENT_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area && !isPatientPath) return NextResponse.next();

  if (!signedIn) return redirect(area === "/clinician" ? "/doctor/login" : "/login", true);
  if (area && role !== AREAS[area]) return redirect(home(role));
  if (isPatientPath && role && role !== "PATIENT") return redirect(home(role));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
