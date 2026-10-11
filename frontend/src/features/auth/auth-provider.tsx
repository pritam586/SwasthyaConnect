"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getAccessToken, getRefreshToken, getStoredUser, persistSession, updateStoredUser } from "@/lib/auth-storage";
import { authService } from "@/services/auth.service";
import type { AuthResponse, AuthUser, DoctorSignup, PatientSignup } from "@/types/user";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  clinicianLogin: (identifier: string, password: string) => Promise<AuthUser>;
  signup: (payload: PatientSignup) => Promise<AuthUser>;
  doctorSignup: (payload: DoctorSignup) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const profile = await authService.me();
    updateStoredUser(profile);
    setUser(profile);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setReady(true);
      return;
    }
    setUser(getStoredUser());
    // The stored copy is only a hint; the server decides who is signed in.
    refreshUser()
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, [refreshUser]);

  const complete = useCallback((result: AuthResponse) => {
    persistSession(result.access_token, result.refresh_token, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      refreshUser,
      login: async (phone, password) => complete(await authService.login(phone, password)),
      clinicianLogin: async (identifier, password) => complete(await authService.clinicianLogin(identifier, password)),
      signup: async (payload) => complete(await authService.signup(payload)),
      doctorSignup: async (payload) => complete(await authService.doctorSignup(payload)),
      logout: async () => {
        try {
          await authService.logout(getRefreshToken());
        } catch {
          // The local session is cleared even if the server cannot be reached.
        }
        clearSession();
        setUser(null);
        router.replace("/login");
      },
    }),
    [user, ready, refreshUser, complete, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
