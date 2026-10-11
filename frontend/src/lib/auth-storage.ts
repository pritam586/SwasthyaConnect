import type { AuthUser, UserRole } from "@/types/user";

/*
 * Tokens live in localStorage because the API is on a different origin (Render) from the
 * site (Vercel). The two cookies below are NOT credentials: middleware.ts only reads them to
 * redirect between pages. Every API call is authorised by the backend from the bearer token.
 */
const ACCESS_KEY = "sc_access_token";
const REFRESH_KEY = "sc_refresh_token";
const USER_KEY = "sc_user";
const SESSION_COOKIE = "sc_session";
const ROLE_COOKIE = "sc_role";

const hasWindow = () => typeof window !== "undefined";

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  return hasWindow() ? localStorage.getItem(ACCESS_KEY) : null;
}

export function getRefreshToken(): string | null {
  return hasWindow() ? localStorage.getItem(REFRESH_KEY) : null;
}

export function getStoredUser(): AuthUser | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function persistSession(accessToken: string, refreshToken: string, user: AuthUser): void {
  persistTokens(accessToken, refreshToken);
  updateStoredUser(user);
  setCookie(SESSION_COOKIE, "1", 7);
}

export function persistTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function updateStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setCookie(ROLE_COOKIE, user.role, 7);
}

export function clearSession(): void {
  if (!hasWindow()) return;
  [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach((key) => localStorage.removeItem(key));
  clearCookie(SESSION_COOKIE);
  clearCookie(ROLE_COOKIE);
}

export function homePathForRole(role: UserRole | undefined): string {
  if (role === "DOCTOR") return "/clinician";
  if (role === "ADMIN") return "/admin";
  return "/dashboard";
}
