import { apiRequest } from "@/lib/api-client";
import type { HealthEncounter, Prescription } from "@/types/clinical";

export const prescriptionService = {
  list() {
    return apiRequest<Prescription[]>("/api/v1/patients/me/prescriptions");
  },
};

export const encounterService = {
  list() {
    return apiRequest<HealthEncounter[]>("/api/v1/patients/me/health-encounters");
  },
};
