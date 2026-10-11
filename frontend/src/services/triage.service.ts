import { apiRequest } from "@/lib/api-client";
import type { TriageResult } from "@/types/clinical";

export const triageService = {
  create: (symptoms: string[], screening_id: string | null) =>
    apiRequest<TriageResult>("/api/v1/triage/cases", { method: "POST", body: { symptoms, screening_id } }),
  mine: () => apiRequest<TriageResult[]>("/api/v1/triage/cases"),
};
