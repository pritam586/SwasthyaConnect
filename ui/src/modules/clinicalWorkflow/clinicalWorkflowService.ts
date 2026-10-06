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

export async function fetchClinicianCases(): Promise<ClinicianCase[]> {
  const response = await fetch("/api/v1/clinical-workflow/cases")
  if (!response.ok) {
    throw new Error("Failed to load clinician cases from server.")
  }
  return response.json()
}

export async function submitPrescription(
  caseId: string,
  data: {
    doctor_id?: string
    doctor_name: string
    diagnosis: string
    clinical_notes: string
    medicines: Array<{ name: string; freq: string }>
  }
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/v1/clinical-workflow/cases/${caseId}/prescription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error("Failed to submit prescription.")
  }
  return response.json()
}
