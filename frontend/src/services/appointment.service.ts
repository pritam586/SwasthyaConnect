import { apiRequest } from "@/lib/api-client";
import type { Appointment } from "@/types/clinical";

export const appointmentService = {
  book: (input: { doctor_id: string; slot_date: string; slot_time: string; notes?: string; triage_case_id?: string | null }) =>
    apiRequest<Appointment>("/api/v1/appointments", { method: "POST", body: input }),
  requestNow: (input: { doctor_id: string; notes?: string; triage_case_id?: string | null }) =>
    apiRequest<Appointment>("/api/v1/appointments/instant", { method: "POST", body: input }),
  mine: () => apiRequest<Appointment[]>("/api/v1/appointments/mine"),
  cancel: (id: string) => apiRequest<Appointment>(`/api/v1/appointments/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  forDoctor: () => apiRequest<Appointment[]>("/api/v1/appointments/doctor"),
  setStatus: (id: string, status: "CONFIRMED" | "REJECTED" | "COMPLETED") =>
    apiRequest<Appointment>(`/api/v1/appointments/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
};
