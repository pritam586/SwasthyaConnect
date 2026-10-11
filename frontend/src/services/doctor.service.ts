import { apiRequest } from "@/lib/api-client";
import type { AvailabilitySlot, Doctor, DoctorSelf, Notification } from "@/types/clinical";

export const doctorService = {
  list: (availableNow = false) => apiRequest<Doctor[]>(`/api/v1/doctors${availableNow ? "?available_now=true" : ""}`),
  me: () => apiRequest<DoctorSelf>("/api/v1/doctors/me"),
  setOnline: (is_online: boolean) => apiRequest<DoctorSelf>("/api/v1/doctors/me/status", { method: "PATCH", body: { is_online } }),
  setAvailability: (slots: AvailabilitySlot[]) =>
    apiRequest<DoctorSelf>("/api/v1/doctors/me/availability", { method: "PUT", body: { slots } }),
  notifications: () => apiRequest<Notification[]>("/api/v1/doctors/me/notifications"),
};
