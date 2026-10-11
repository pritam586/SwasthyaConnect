import { apiRequest } from "@/lib/api-client";
import type { Message } from "@/types/api";
import type {
  AbhaLinkResult,
  DashboardSummary,
  Encounter,
  EncounterInput,
  Medication,
  MedicationInput,
  Notification,
  Prescription,
} from "@/types/clinical";
import type { PatientProfile, ProfileUpdate } from "@/types/user";

const base = "/api/v1/patients/me";

export const patientService = {
  profile: () => apiRequest<PatientProfile>(`${base}/profile`),
  updateProfile: (changes: ProfileUpdate) => apiRequest<PatientProfile>(`${base}/profile`, { method: "PATCH", body: changes }),
  dashboard: () => apiRequest<DashboardSummary>(`${base}/dashboard`),
  medications: () => apiRequest<Medication[]>(`${base}/medications`),
  addMedication: (input: MedicationInput) => apiRequest<Medication>(`${base}/medications`, { method: "POST", body: input }),
  deleteMedication: (id: string) => apiRequest<Message>(`${base}/medications/${encodeURIComponent(id)}`, { method: "DELETE" }),
  encounters: () => apiRequest<Encounter[]>(`${base}/encounters`),
  addEncounter: (input: EncounterInput) => apiRequest<Encounter>(`${base}/encounters`, { method: "POST", body: input }),
  prescriptions: () => apiRequest<Prescription[]>(`${base}/prescriptions`),
  notifications: () => apiRequest<Notification[]>(`${base}/notifications`),
  markNotificationRead: (id: string) =>
    apiRequest<Message>(`${base}/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
  linkAbha: (abha_number: string, consent_granted: boolean) =>
    apiRequest<AbhaLinkResult>("/api/v1/abha/link", { method: "POST", body: { abha_number, consent_granted } }),
  unlinkAbha: () => apiRequest<Message>("/api/v1/abha/link", { method: "DELETE" }),
};
