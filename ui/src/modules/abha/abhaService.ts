import { errorMessage } from "../http"

export type AbhaLinkResponse = {
  integration_status: "linked" | "optional_skipped" | "sandbox_mode"
  linked: boolean
  pmjay_eligible: boolean
  annual_coverage_inr: number
  abha_number: string | null
  message: string
}

export async function requestAbhaLink(
  abhaNumber: string,
  consentGranted: boolean,
  skip: boolean = false
): Promise<AbhaLinkResponse> {
  const response = await fetch("/api/v1/abha/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      abha_number: abhaNumber,
      consent_granted: consentGranted,
      skip: skip,
    }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
    throw new Error(errorMessage(payload, "ABHA request failed."))
  }
  return response.json()
}
