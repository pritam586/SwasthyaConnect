import type { AuthUser, UserRole } from "@/types/user";

const ACCESS_KEY = "sc_access_token";
const REFRESH_KEY = "sc_refresh_token";
const USER_KEY = "sc_user";
const SESSION_COOKIE = "sc_session";
const ROLE_COOKIE = "sc_role";

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

function setCookie(name: string, value: string, days: number): void {
  if (!canUseDom()) return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (!canUseDom()) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  if (!canUseDom()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseDom()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!canUseDom()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(token: string, refreshToken: string, user: AuthUser): void {
  if (!canUseDom()) return;
  localStorage.setItem(ACCESS_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setCookie(SESSION_COOKIE, "1", 7);
  setCookie(ROLE_COOKIE, user.role, 7);
}

export function persistTokens(token: string, refreshToken: string): void {
  if (!canUseDom()) return;
  localStorage.setItem(ACCESS_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function updateStoredUser(user: AuthUser): void {
  if (!canUseDom()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setCookie(ROLE_COOKIE, user.role, 7);
}

export function clearSession(): void {
  if (!canUseDom()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  clearCookie(SESSION_COOKIE);
  clearCookie(ROLE_COOKIE);
}

export function homePathForRole(role: UserRole | string | undefined): string {
  if (role === "DOCTOR") return "/clinician";
  if (role === "ADMIN") return "/admin";
  return "/dashboard";
}
