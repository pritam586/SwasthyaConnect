export type ClinicianCase = {
  case_id: string
  clinician_review_required: boolean
  source: string
}

const endpoint = import.meta.env.VITE_CLINICAL_WORKFLOW_API_URL ?? "/api/v1/clinical-workflow/cases"

export async function requestClinicianCases(): Promise<ClinicianCase[]> {
  const response = await fetch(endpoint)
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error("The clinician workflow is unavailable. No patient data was loaded.")
  }
  return payload.filter(isClinicianCase)
}

function isClinicianCase(value: unknown): value is ClinicianCase {
  return Boolean(value && typeof value === "object"
    && typeof (value as Record<string, unknown>).case_id === "string"
    && typeof (value as Record<string, unknown>).clinician_review_required === "boolean"
    && typeof (value as Record<string, unknown>).source === "string")
}
