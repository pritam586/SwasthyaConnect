export type TriageLevel = "GREEN" | "YELLOW" | "RED";

export interface ScreeningAnalyzeResult {
  analysis_id?: string;
  screening_label: string;
  confidence: number;
  triage_level: TriageLevel | string;
  quality_passed: boolean;
  quality_reason: string;
  grad_cam_image_url: string | null;
  explanation: string;
  disclaimer: string;
}

export interface TriageVisualContext {
  status: "available" | "inconclusive" | "unavailable";
  confidence: number;
  screening_label: string;
  quality_passed: boolean;
  grad_cam_url?: string | null;
}

export interface TriageAssessment {
  case_id: string;
  urgency: "green" | "yellow" | "red";
  ai_summary: string;
  explainability_note: string;
  visual_confidence: number;
  disclaimer: string;
}

export interface ClinicalCase {
  id: string;
  user_id: string | null;
  patient_name: string;
  age: string;
  gender: string;
  phone: string;
  location: string;
  abha_id: string | null;
  pmjay_eligible: boolean;
  visual_confidence: number;
  symptoms: string[];
  ai_summary: string;
  urgency: "green" | "yellow" | "red";
  status: string;
  diagnosis: string | null;
  rx_notes: string | null;
  created_at: string;
}

export interface ClinicianPrescriptionPayload {
  diagnosis: string;
  clinical_notes?: string;
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
}
