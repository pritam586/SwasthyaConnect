export type UrgencyLevel = "green" | "yellow" | "red"

export type TriageSubmission = {
  user_id?: string
  patient_name: string
  age: string
  gender: string
  phone: string
  location: string
  abha_id?: string | null
  pmjay_eligible?: boolean
  symptom_answers: string[]
  transcript?: string
  visual_screening?: {
    status: "available" | "inconclusive" | "unavailable"
    confidence: number
    screening_label: string
    quality_passed: boolean
  }
}

export type TriageAssessmentResult = {
  case_id: string
  urgency: UrgencyLevel
  ai_summary: string
  explainability_note: string
  visual_confidence: number
  disclaimer: string
}

export async function submitTriageAssessment(input: TriageSubmission): Promise<TriageAssessmentResult> {
  const response = await fetch("/api/v1/triage/assess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.detail || "Triage assessment failed.")
  }
  return payload
}
