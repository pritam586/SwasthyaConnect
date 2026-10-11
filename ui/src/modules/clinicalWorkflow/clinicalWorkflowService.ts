import { authHeaders, errorMessage } from "../http"

export type ClinicianCase = {
  id: string
  patient_name: string
  age: string
  gender: string
  phone: string
  location: string
  abha_id?: string | null
  pmjay_eligible: boolean
  visual_confidence: number
  symptoms: string[]
  ai_summary: string
  urgency: "green" | "yellow" | "red"
  status: string
  diagnosis?: string | null
  rx_notes?: string | null
  created_at: string
}

/** Matches PrescriptionMedicineItem in backend/clinical_workflow/service.py. */
export type PrescriptionMedicine = {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export async function fetchClinicianCases(): Promise<ClinicianCase[]> {
  const response = await fetch("/api/v1/clinical-workflow/cases", { headers: authHeaders() })
  if (!response.ok) {
    throw new Error("Failed to load clinician cases from server.")
  }
  return response.json()
}

export async function submitPrescription(
  caseId: string,
  data: {
    diagnosis: string
    clinical_notes: string
    medicines: PrescriptionMedicine[]
  }
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/v1/clinical-workflow/cases/${caseId}/prescription`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
    throw new Error(errorMessage(payload, "Failed to submit prescription."))
  }
  return response.json()
}
