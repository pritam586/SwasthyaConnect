export type VisualScreeningLabel = "anemia_likely" | "anemia_unlikely" | "inconclusive"

export type VisualScreeningResult = {
  screening_label: VisualScreeningLabel
  confidence: number
  quality_passed: boolean
  quality_reason: string
  grad_cam_image_url?: string
  disclaimer: string
}

export class VisualScreeningServiceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "VisualScreeningServiceError"
  }
}

const endpoint = import.meta.env.VITE_VISUAL_SCREENING_API_URL ?? "/api/v1/visual-screening/analyze"

function isVisualScreeningResult(value: unknown): value is VisualScreeningResult {
  if (!value || typeof value !== "object") return false
  const result = value as Record<string, unknown>
  return (
    ["anemia_likely", "anemia_unlikely", "inconclusive"].includes(String(result.screening_label)) &&
    typeof result.confidence === "number" &&
    typeof result.quality_passed === "boolean" &&
    typeof result.quality_reason === "string" &&
    typeof result.disclaimer === "string"
  )
}

/**
 * Contract for Sairaj's future CNN service. The user interface must show a
 * screening result only after this endpoint returns a quality-approved image.
 */
export async function requestVisualScreening(image: File): Promise<VisualScreeningResult> {
  const body = new FormData()
  body.append("image", image)

  const response = await fetch(endpoint, { method: "POST", body })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new VisualScreeningServiceError(
      response.status,
      payload?.detail ?? "Visual screening is unavailable. No result was generated.",
    )
  }
  const result: unknown = await response.json().catch(() => null)
  if (!isVisualScreeningResult(result)) {
    throw new VisualScreeningServiceError(502, "The screening service returned an invalid response.")
  }
  return result
}
