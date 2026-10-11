import { apiRequest } from "@/lib/api-client";
import type { Message } from "@/types/api";
import type { DoctorSelf } from "@/types/clinical";
import type { Medicine } from "@/types/pharmacy";

export interface AdminStats {
  patients: number;
  doctors: number;
  doctors_pending_verification: number;
  pharmacies: number;
  medicines: number;
  appointments: number;
  triage_cases: number;
  screenings: number;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminPharmacy {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  is_jan_aushadhi: boolean;
  open_hours: string | null;
  active: boolean;
}

export const adminService = {
  stats: () => apiRequest<AdminStats>("/api/v1/admin/stats"),
  users: () => apiRequest<AdminUser[]>("/api/v1/admin/users"),
  setUserActive: (id: string, is_active: boolean) =>
    apiRequest<Message>(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { is_active } }),
  doctors: (verification?: "PENDING" | "VERIFIED" | "REJECTED") =>
    apiRequest<DoctorSelf[]>(`/api/v1/admin/doctors${verification ? `?verification=${verification}` : ""}`),
  verifyDoctor: (id: string, status: "VERIFIED" | "REJECTED" | "PENDING") =>
    apiRequest<DoctorSelf>(`/api/v1/admin/doctors/${encodeURIComponent(id)}/verification`, { method: "PATCH", body: { status } }),
  pharmacies: () => apiRequest<AdminPharmacy[]>("/api/v1/admin/pharmacies"),
  createPharmacy: (input: Omit<AdminPharmacy, "id" | "active">) =>
    apiRequest<AdminPharmacy>("/api/v1/admin/pharmacies", { method: "POST", body: input }),
  createMedicine: (input: Omit<Medicine, "id">) => apiRequest<Medicine>("/api/v1/admin/medicines", { method: "POST", body: input }),
  upsertInventory: (input: { pharmacy_id: string; medicine_id: string; stock_status: string; quantity: number; price_inr?: number | null }) =>
    apiRequest<unknown>("/api/v1/admin/inventory", { method: "PUT", body: input }),
  medicines: () => apiRequest<Medicine[]>("/api/v1/medicines"),
};
