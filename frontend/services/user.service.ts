import { apiRequest } from "@/lib/api-client";
import type { DashboardSummary, NotificationItem } from "@/types/clinical";
import type { PatientProfile, PatientProfileUpdate } from "@/types/user";
import type { AdminStats } from "@/types/api";

export const userService = {
  profile() {
    return apiRequest<PatientProfile>("/api/v1/patients/me/profile");
  },

  updateProfile(payload: PatientProfileUpdate) {
    return apiRequest<{ success: boolean; message: string }>("/api/v1/patients/me/profile", {
      method: "PATCH",
      body: payload,
    });
  },

  dashboard() {
    return apiRequest<DashboardSummary>("/api/v1/patients/me/dashboard-summary");
  },

  notifications() {
    return apiRequest<NotificationItem[]>("/api/v1/patients/me/notifications");
  },

  markNotificationRead(id: string) {
    return apiRequest<{ success: boolean }>(`/api/v1/patients/me/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  adminStats() {
    return apiRequest<AdminStats>("/api/v1/admin/stats");
  },
};
