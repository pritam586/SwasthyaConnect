import { apiRequest } from "@/lib/api-client";
import type { ClinicalCase, PrescriptionMedicine } from "@/types/clinical";

export const clinicalService = {
  cases: (status: "pending" | "reviewed" | "all" = "pending") =>
    apiRequest<ClinicalCase[]>(`/api/v1/clinical/cases?status=${status}`),
  prescribe: (caseId: string, input: { diagnosis: string; clinical_notes?: string; medicines: PrescriptionMedicine[] }) =>
    apiRequest<ClinicalCase>(`/api/v1/clinical/cases/${encodeURIComponent(caseId)}/prescription`, { method: "POST", body: input }),
};
