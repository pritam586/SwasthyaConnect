export type TriageStatus = "inconclusive"

export type TriageRequest = {
  symptom_answers: string[]
  transcript?: string
  visual_screening?: {
    status: "available" | "inconclusive" | "unavailable"
    quality_passed: boolean
    model_version?: string
  }
}

export type TriageResponse = {
  status: TriageStatus
  clinician_review_required: true
  reasons: string[]
  disclaimer: string
}

export class TriageServiceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "TriageServiceError"
  }
}

const endpoint = import.meta.env.VITE_TRIAGE_API_URL ?? "/api/v1/triage/assess"

export async function requestTriageAssessment(input: TriageRequest): Promise<TriageResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "detail" in payload
      ? String(payload.detail)
      : "Symptom collection is unavailable. No triage result was generated."
    throw new TriageServiceError(response.status, message)
  }
  if (!isSafeTriageResponse(payload)) {
    throw new TriageServiceError(502, "The triage service returned an invalid or unsafe response.")
  }
  return payload
}

function isSafeTriageResponse(value: unknown): value is TriageResponse {
  if (!value || typeof value !== "object") return false
  const response = value as Record<string, unknown>
  return response.status === "inconclusive"
    && response.clinician_review_required === true
    && Array.isArray(response.reasons)
    && response.reasons.every((reason) => typeof reason === "string")
    && typeof response.disclaimer === "string"
}
