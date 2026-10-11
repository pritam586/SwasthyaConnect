export type ScreeningLabel = "anemia_likely" | "anemia_unlikely" | "inconclusive";
export type Urgency = "green" | "yellow" | "red";

export interface Screening {
  id: string | null;
  screening_label: ScreeningLabel;
  confidence: number;
  triage_level: string;
  quality_passed: boolean;
  quality_reason: string | null;
  explanation: string | null;
  model_version: string | null;
  image_file_id: string | null;
  heatmap_file_id: string | null;
  disclaimer: string;
  created_at: string | null;
}

export interface TriageResult {
  id: string;
  urgency: Urgency;
  summary: string;
  explanation: string;
  visual_confidence: number;
  screening_id: string | null;
  status: string;
  disclaimer: string;
  created_at: string;
}

export interface Medication {
  id: string;
  medicine_name: string;
  generic_name: string | null;
  dosage: string | null;
  frequency: string | null;
  route: string;
  start_date: string | null;
  end_date: string | null;
  prescribed_by: string | null;
  prescription_id: string | null;
  status: string;
  instructions: string | null;
  created_at: string;
}

export interface MedicationInput {
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  start_date?: string;
  instructions?: string;
}

export interface Encounter {
  id: string;
  encounter_date: string;
  reason: string;
  doctor_name: string | null;
  symptoms: string | null;
  diagnosis_notes: string | null;
  treatment_notes: string | null;
  prescription_id: string | null;
  created_at: string;
}

export interface EncounterInput {
  encounter_date: string;
  reason: string;
  doctor_name?: string;
  symptoms?: string;
  diagnosis_notes?: string;
  treatment_notes?: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

export interface Prescription {
  id: string;
  doctor_name: string;
  prescription_date: string;
  diagnosis: string | null;
  instructions: string | null;
  status: string;
  medicines: PrescriptionMedicine[];
  created_at: string;
}

export interface MedicalReport {
  id: string;
  report_title: string;
  report_type: string;
  original_file_name: string;
  file_type: string;
  file_id: string;
  extracted_medicines: { medicine_id: string; name: string; generic_name: string }[];
  summary: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardSummary {
  active_medications: number;
  encounters: number;
  reports: number;
  prescriptions: number;
  screenings: number;
  unread_notifications: number;
  upcoming_appointment: { id: string; doctor_name: string; slot_date: string; slot_time: string; status: string } | null;
  latest_screening: { id: string; screening_label: ScreeningLabel; confidence: number; created_at: string } | null;
}

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  clinic_name: string | null;
  location: string | null;
  consultation_fee: number;
  is_online: boolean;
  available_now: boolean;
  availability: AvailabilitySlot[];
}

export interface DoctorSelf extends Doctor {
  license_number: string;
  verification_status: "PENDING" | "VERIFIED" | "REJECTED";
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  slot_date: string;
  slot_time: string;
  appointment_type: "SCHEDULED" | "INSTANT";
  status: "REQUESTED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  notes: string | null;
  triage_case_id: string | null;
  created_at: string;
}

export interface ClinicalCase {
  id: string;
  patient_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  location: string | null;
  abha_id: string | null;
  urgency: Urgency;
  status: "pending" | "reviewed";
  symptoms: string[];
  summary: string;
  explanation: string;
  visual_confidence: number;
  screening: {
    id: string;
    screening_label: ScreeningLabel;
    confidence: number;
    heatmap_file_id: string | null;
    image_file_id: string | null;
    model_version: string;
    explanation: string | null;
  } | null;
  diagnosis: string | null;
  clinical_notes: string | null;
  created_at: string;
}

export interface AbhaLinkResult {
  integration_status: "sandbox_mode" | "invalid";
  linked: boolean;
  abha_number: string | null;
  pmjay_mock_eligible: boolean;
  message: string;
}
