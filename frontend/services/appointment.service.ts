import { apiRequest } from "@/lib/api-client";
import type { Appointment, BookAppointmentPayload, Doctor } from "@/types/clinical";

export const appointmentService = {
  mine() {
    return apiRequest<Appointment[]>("/api/v1/appointments/my");
  },

  book(payload: BookAppointmentPayload) {
    return apiRequest<{
      success: boolean;
      appointment_id: string;
      doctor_name: string;
      slot_date: string;
      slot_time: string;
      status: string;
      message: string;
    }>("/api/v1/appointments/book", { method: "POST", body: payload });
  },

  cancel(id: string) {
    return apiRequest<{ success: boolean; message: string }>(`/api/v1/appointments/${id}/cancel`, {
      method: "POST",
    });
  },

  doctorMine() {
    return apiRequest<Appointment[]>("/api/v1/appointments/doctor/my");
  },

  updateStatus(id: string, status: "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED", notes?: string) {
    return apiRequest<{ success: boolean; appointment_id: string; status: string }>(
      `/api/v1/appointments/${id}/status`,
      { method: "PATCH", body: { status, notes } },
    );
  },
};

export const doctorService = {
  list() {
    return apiRequest<Doctor[]>("/api/v1/doctors");
  },

  get(id: string) {
    return apiRequest<Doctor>(`/api/v1/doctors/${id}`);
  },
};
