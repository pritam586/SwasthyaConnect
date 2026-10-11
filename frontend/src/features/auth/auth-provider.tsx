"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  homePathForRole,
  persistSession,
  updateStoredUser,
} from "@/lib/auth-storage";
import { authService } from "@/services/auth.service";
import type { AuthUser, SignupPayload } from "@/types/user";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  clinicianLogin: (identifier: string, password: string) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    const tokenPresent = typeof window !== "undefined" && Boolean(localStorage.getItem("sc_access_token"));
    if (!tokenPresent) {
      setReady(true);
      return;
    }
    authService
      .me()
      .then((profile) => {
        setUser(profile);
        updateStoredUser(profile);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const completeAuth = useCallback((token: string, refresh: string, nextUser: AuthUser) => {
    persistSession(token, refresh, nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      const result = await authService.login(phone, password);
      return completeAuth(result.token, result.refresh_token, result.user);
    },
    [completeAuth],
  );

  const clinicianLogin = useCallback(
    async (identifier: string, password: string) => {
      const result = await authService.clinicianLogin(identifier, password);
      return completeAuth(result.token, result.refresh_token, result.user);
    },
    [completeAuth],
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const result = await authService.signup(payload);
      return completeAuth(result.token, result.refresh_token, result.user);
    },
    [completeAuth],
  );

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      await authService.logout(refresh);
    } catch {
      /* still clear local session */
    }
    clearSession();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const profile = await authService.me();
    setUser(profile);
    updateStoredUser(profile);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, clinicianLogin, signup, logout, refreshUser }),
    [user, ready, login, clinicianLogin, signup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { homePathForRole };
