import { apiRequest } from "@/lib/api-client";
import type { AuthResponse, AuthUser, SignupPayload } from "@/types/user";
import type { SendOtpResponse, VerifyOtpResponse } from "@/types/api";

export const authService = {
  sendOtp(phone: string) {
    return apiRequest<SendOtpResponse>("/api/v1/auth/send-otp", {
      method: "POST",
      body: { phone },
      auth: false,
    });
  },

  verifyOtp(phone: string, otp_code: string) {
    return apiRequest<VerifyOtpResponse>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: { phone, otp_code },
      auth: false,
    });
  },

  signup(payload: SignupPayload) {
    return apiRequest<AuthResponse>("/api/v1/auth/signup", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  login(phone: string, password: string) {
    return apiRequest<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { phone, password },
      auth: false,
    });
  },

  clinicianLogin(phone_or_email: string, password: string) {
    return apiRequest<AuthResponse>("/api/v1/auth/doctor-login", {
      method: "POST",
      body: { phone_or_email, password },
      auth: false,
    });
  },

  me() {
    return apiRequest<AuthUser>("/api/v1/auth/me");
  },

  logout(refresh_token: string | null) {
    return apiRequest<{ success: boolean; message: string }>("/api/v1/auth/logout", {
      method: "POST",
      body: { refresh_token },
      auth: false,
    });
  },
};
