export type AbhaLinkResponse = {
  integration_status: "not_configured"
  linked: false
  message: string
}

const endpoint = import.meta.env.VITE_ABHA_API_URL ?? "/api/v1/abha/link"

export async function requestAbhaLink(abhaNumber: string, consentGranted: boolean): Promise<AbhaLinkResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ abha_number: abhaNumber, consent_granted: consentGranted }),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || !isSafeAbhaResponse(payload)) {
    throw new Error("ABHA linking is unavailable. No health record was linked.")
  }
  return payload
}

function isSafeAbhaResponse(value: unknown): value is AbhaLinkResponse {
  return Boolean(value && typeof value === "object"
    && (value as Record<string, unknown>).integration_status === "not_configured"
    && (value as Record<string, unknown>).linked === false
    && typeof (value as Record<string, unknown>).message === "string")
}
