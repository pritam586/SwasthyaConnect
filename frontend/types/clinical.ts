export type MedicationStatus = "ACTIVE" | "COMPLETED" | "STOPPED";

export interface Medication {
  id: string;
  patient_id: string;
  medicine_name: string;
  generic_name: string | null;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string | null;
  end_date: string | null;
  prescribed_by: string | null;
  prescription_id: string | null;
  status: MedicationStatus | string;
  instructions: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AddMedicationPayload {
  medicine_name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  start_date?: string;
  end_date?: string;
  instructions?: string;
}

export interface HealthEncounter {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  doctor_name: string | null;
  encounter_date: string;
  reason: string;
  symptoms: string | null;
  diagnosis_notes: string | null;
  treatment_notes: string | null;
  prescription_id: string | null;
  consultation_id: string | null;
  status: string;
  created_at: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string | null;
}

export interface Prescription {
  id: string;
  doctor_id: string;
  doctor_name: string;
  prescription_date: string;
  diagnosis: string | null;
  instructions: string | null;
  status: string;
  medicines: PrescriptionMedicine[];
  created_at: string;
}

export type AppointmentStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | string;

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  doctor_name: string;
  slot_date: string;
  slot_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface BookAppointmentPayload {
  doctor_id: string;
  slot_date: string;
  slot_time: string;
  notes?: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  name: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  license_number: string | null;
  clinic_name: string | null;
  location: string | null;
  availability_json?: string | null;
  availability?: string[];
  consultation_fee: number;
  profile_image_url: string | null;
  rating: number;
  verification_status: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: number | boolean;
  created_at: string;
}

export interface AiAnalysis {
  id: string;
  patient_id: string;
  image_url: string | null;
  model_version: string | null;
  input_type: string | null;
  prediction: string;
  confidence: number;
  triage_level: "GREEN" | "YELLOW" | "RED" | string | null;
  quality_passed: number | boolean;
  quality_reason: string | null;
  grad_cam_url: string | null;
  explanation: string | null;
  disclaimer: string;
  status: string;
  created_at: string;
}

export interface DashboardSummary {
  user: {
    id: string;
    name: string;
    role: string;
    location: string | null;
  };
  counts: {
    active_medications: number;
    encounters: number;
    reports: number;
    prescriptions: number;
    ai_analyses: number;
    unread_notifications: number;
  };
  upcoming_appointment: Appointment | null;
  latest_ai_screening: AiAnalysis | null;
}
