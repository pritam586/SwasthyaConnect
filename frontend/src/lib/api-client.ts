import { clearSession, getAccessToken, getRefreshToken, persistTokens } from "@/lib/auth-storage";
import { ApiError } from "@/types/api";

/** Empty in local development (requests go through the Next.js /api proxy). */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

function url(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** The backend always answers errors as {"error": {"code", "message", "details"?}}. */
function readError(payload: unknown, status: number): ApiError {
  const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
  return new ApiError({
    status,
    code: error?.code,
    message: error?.message ?? (status >= 500 ? "The server had a problem. Please try again." : `Request failed (${status}).`),
  });
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(url("/api/v1/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        clearSession();
        return false;
      }
      const body = (await response.json()) as { access_token: string; refresh_token: string };
      persistTokens(body.access_token, body.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions, retried: boolean): Promise<Response> {
  const { method = "GET", body, formData, auth = true, signal } = options;
  const headers = new Headers();
  if (!formData && body !== undefined) headers.set("Content-Type", "application/json");
  const token = auth ? getAccessToken() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url(path), {
      method,
      headers,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ status: 0, code: "NETWORK", message: "Cannot reach the server. Check your internet connection." });
  }

  if (response.status === 401 && auth && !retried && (await refreshTokens())) {
    return send(path, options, true);
  }
  return response;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options, false);
  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw readError(payload, response.status);
  return payload as T;
}

/** Downloads a protected file (report, eye photo, heatmap) as a blob with the user's token. */
export async function apiBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const response = await send(path, { signal }, false);
  if (!response.ok) throw readError(await response.json().catch(() => null), response.status);
  return response.blob();
}
