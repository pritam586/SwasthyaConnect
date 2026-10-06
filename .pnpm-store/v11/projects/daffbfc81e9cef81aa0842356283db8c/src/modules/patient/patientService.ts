/**
 * Patient-specific Service for SwasthyaConnect.
 * Communicates with backend endpoints:
 * - GET /api/v1/patients/me/profile
 * - PATCH /api/v1/patients/me/profile
 * - GET /api/v1/patients/me/medications
 * - POST /api/v1/patients/me/medications
 * - DELETE /api/v1/patients/me/medications/:id
 * - GET /api/v1/patients/me/health-encounters
 * - POST /api/v1/patients/me/health-encounters
 * - GET /api/v1/patients/me/reports
 * - GET /api/v1/patients/me/prescriptions
 * - GET /api/v1/patients/me/ai-analyses
 * - POST /api/v1/patients/me/ai-analyses
 * - GET /api/v1/patients/me/appointments
 * - GET /api/v1/doctors
 */

export interface PatientMedication {
  id: string
  patient_id: string
  medicine_name: string
  generic_name?: string
  dosage?: string
  frequency?: string
  route?: string
  start_date?: string
  end_date?: string
  status: "ACTIVE" | "COMPLETED" | "STOPPED"
  instructions?: string
  created_at: string
}

export interface PatientHealthEncounter {
  id: string
  patient_id: string
  doctor_id?: string
  doctor_name: string
  encounter_date: string
  reason: string
  symptoms?: string
  diagnosis_notes?: string
  treatment_notes?: string
  status: string
  created_at: string
}

export interface PatientPrescription {
  id: string
  doctor_id: string
  doctor_name: string
  prescription_date: string
  instructions?: string
  status: string
  medicines: Array<{
    name: string
    dosage?: string
    frequency?: string
    duration?: string
  }>
  created_at: string
}

export interface PatientAiAnalysis {
  id: string
  patient_id: string
  image_url?: string
  model_version?: string
  prediction: string
  confidence: number
  triage_level?: "GREEN" | "YELLOW" | "RED"
  quality_passed: boolean
  quality_reason?: string
  grad_cam_url?: string
  explanation?: string
  disclaimer: string
  created_at: string
}

export interface DoctorProfile {
  id: string
  name: string
  specialization: string
  qualification: string
  experience_years: number
  license_number?: string
  clinic_name: string
  location: string
  availability: string[]
  consultation_fee: number
  profile_image_url?: string
  rating: number
}

function authHeaders(token?: string) {
  const t = token || localStorage.getItem("sc_token") || ""
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  }
}

export async function fetchMyProfile(token?: string): Promise<any> {
  const res = await fetch("/api/v1/patients/me/profile", {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error("Failed to fetch profile.")
  return res.json()
}

export async function updateMyProfile(data: any, token?: string): Promise<any> {
  const res = await fetch("/api/v1/patients/me/profile", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update profile.")
  return res.json()
}

export async function fetchMyMedications(token?: string): Promise<PatientMedication[]> {
  const res = await fetch("/api/v1/patients/me/medications", {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error("Failed to fetch medications.")
  return res.json()
}

export async function addMyMedication(data: {
  medicine_name: string
  generic_name?: string
  dosage?: string
  frequency?: string
  instructions?: string
}, token?: string): Promise<any> {
  const res = await fetch("/api/v1/patients/me/medications", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to add medication.")
  return res.json()
}

export async function deleteMyMedication(medId: string, token?: string): Promise<any> {
  const res = await fetch(`/api/v1/patients/me/medications/${medId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error("Failed to delete medication.")
  return res.json()
}

export async function fetchMyEncounters(token?: string): Promise<PatientHealthEncounter[]> {
  const res = await fetch("/api/v1/patients/me/health-encounters", {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error("Failed to fetch encounters.")
  return res.json()
}

export async function addMyEncounter(data: {
  encounter_date: string
  reason: string
  doctor_name?: string
  symptoms?: string
  diagnosis_notes?: string
  treatment_notes?: string
}, token?: string): Promise<any> {
  const res = await fetch("/api/v1/patients/me/health-encounters", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to record encounter.")
  return res.json()
}

export async function fetchMyPrescriptions(token?: string): Promise<PatientPrescription[]> {
  const res = await fetch("/api/v1/patients/me/prescriptions", {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error("Failed to fetch prescriptions.")
  return res.json()
}

export async function fetchMyAiAnalyses(token?: string): Promise<PatientAiAnalysis[]> {
  const res = await fetch("/api/v1/patients/me/ai-analyses", {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error("Failed to fetch AI analyses.")
  return res.json()
}

export async function saveMyAiAnalysis(data: {
  prediction: string
  confidence: number
  triage_level: "GREEN" | "YELLOW" | "RED"
  quality_passed: boolean
  quality_reason?: string
  grad_cam_url?: string
  explanation?: string
}, token?: string): Promise<any> {
  const res = await fetch("/api/v1/patients/me/ai-analyses", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to save AI screening record.")
  return res.json()
}

export async function fetchDoctors(): Promise<DoctorProfile[]> {
  const res = await fetch("/api/v1/doctors")
  if (!res.ok) throw new Error("Failed to fetch doctors list.")
  return res.json()
}
