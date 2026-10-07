import { apiRequest } from "@/lib/api-client";
import type { AiAnalysis } from "@/types/clinical";
import type {
  ClinicalCase,
  ClinicianPrescriptionPayload,
  ScreeningAnalyzeResult,
  TriageAssessment,
  TriageVisualContext,
} from "@/types/screening";

export const screeningService = {
  analyze(image: File) {
    const form = new FormData();
    form.append("image", image);
    return apiRequest<ScreeningAnalyzeResult>("/api/v1/visual-screening/analyze", {
      method: "POST",
      formData: form,
    });
  },

  history() {
    return apiRequest<AiAnalysis[]>("/api/v1/patients/me/ai-analyses");
  },

  submitTriage(payload: {
    patient_name: string;
    age: string;
    gender: string;
    phone: string;
    location: string;
    symptom_answers: string[];
    visual_screening?: TriageVisualContext;
  }) {
    return apiRequest<TriageAssessment>("/api/v1/triage/assess", {
      method: "POST",
      body: payload,
    });
  },
};

export const clinicalWorkflowService = {
  cases() {
    return apiRequest<ClinicalCase[]>("/api/v1/clinical-workflow/cases");
  },

  prescribe(caseId: string, payload: ClinicianPrescriptionPayload) {
    return apiRequest<{ success: boolean; prescription_id?: string; message?: string }>(
      `/api/v1/clinical-workflow/cases/${caseId}/prescription`,
      { method: "POST", body: payload },
    );
  },
};
