import { apiRequest } from "@/lib/api-client";
import type { AddMedicationPayload, Medication } from "@/types/clinical";

export const medicationService = {
  list() {
    return apiRequest<Medication[]>("/api/v1/patients/me/medications");
  },

  add(payload: AddMedicationPayload) {
    return apiRequest<{ success: boolean; id: string; medicine_name: string }>(
      "/api/v1/patients/me/medications",
      { method: "POST", body: payload },
    );
  },

  remove(id: string) {
    return apiRequest<{ success: boolean; message: string }>(`/api/v1/patients/me/medications/${id}`, {
      method: "DELETE",
    });
  },
};
