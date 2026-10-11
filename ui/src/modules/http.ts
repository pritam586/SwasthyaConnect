/**
 * Shared request helpers. Every protected backend route expects
 * `Authorization: Bearer <access token>`; the token is saved at login as `sc_token`.
 */

export function getAccessToken(): string {
  try {
    return localStorage.getItem("sc_token") || ""
  } catch {
    return ""
  }
}

/**
 * Readable message from a FastAPI error body. `detail` is a string for HTTPException
 * but a list of field errors for validation failures (422).
 */
export function errorMessage(payload: unknown, fallback: string): string {
  const detail = (payload as { detail?: unknown } | null)?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : ""
      return field ? `${field}: ${item?.msg ?? "invalid"}` : String(item?.msg ?? "invalid")
    })
    if (parts.length) return parts.join("; ")
  }
  return fallback
}

/** Headers for a request. Pass `json: false` for FormData bodies so the browser sets the boundary. */
export function authHeaders(token?: string, json = true): Record<string, string> {
  const t = token || getAccessToken()
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  }
}
