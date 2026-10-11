import { apiRequest } from "@/lib/api-client";
import type { Message } from "@/types/api";
import type { AuthResponse, AuthUser, DoctorSignup, PatientSignup } from "@/types/user";

export const authService = {
  sendOtp: (phone: string) =>
    apiRequest<{ message: string; provider: string; dev_code: string | null }>("/api/v1/auth/send-otp", {
      method: "POST",
      body: { phone },
      auth: false,
    }),
  verifyOtp: (phone: string, otp_code: string) =>
    apiRequest<Message>("/api/v1/auth/verify-otp", { method: "POST", body: { phone, otp_code }, auth: false }),
  signup: (payload: PatientSignup) =>
    apiRequest<AuthResponse>("/api/v1/auth/signup", { method: "POST", body: payload, auth: false }),
  doctorSignup: (payload: DoctorSignup) =>
    apiRequest<AuthResponse>("/api/v1/auth/doctor/signup", { method: "POST", body: payload, auth: false }),
  login: (phone: string, password: string) =>
    apiRequest<AuthResponse>("/api/v1/auth/login", { method: "POST", body: { phone, password }, auth: false }),
  clinicianLogin: (identifier: string, password: string) =>
    apiRequest<AuthResponse>("/api/v1/auth/doctor/login", { method: "POST", body: { identifier, password }, auth: false }),
  logout: (refresh_token: string | null) =>
    apiRequest<Message>("/api/v1/auth/logout", { method: "POST", body: { refresh_token }, auth: false }),
  me: () => apiRequest<AuthUser>("/api/v1/auth/me"),
};
