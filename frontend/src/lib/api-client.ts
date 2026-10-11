import { ApiError } from "@/types/api";
import { clearSession, getAccessToken, getRefreshToken, persistTokens } from "@/lib/auth-storage";

const API_PREFIX = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function joinUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_PREFIX}${path}`;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  if (Array.isArray(record.detail) && record.detail[0] && typeof record.detail[0] === "object") {
    const first = record.detail[0] as Record<string, unknown>;
    if (typeof first.msg === "string") return first.msg;
  }
  if (record.error && typeof record.error === "object") {
    const err = record.error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
  }
  if (typeof record.message === "string") return record.message;
  return fallback;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(joinUrl("/api/v1/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        clearSession();
        return false;
      }
      const body = (await response.json()) as { token: string; refresh_token: string };
      persistTokens(body.token, body.refresh_token);
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
  method?: string;
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, auth = true, signal } = options;

  const execute = async (retried: boolean): Promise<T> => {
    const headers = new Headers();
    if (!formData) {
      headers.set("Content-Type", "application/json");
    }
    if (auth) {
      const token = getAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(joinUrl(path), {
      method,
      headers,
      body: formData ? formData : body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

    if (response.status === 401 && auth && !retried) {
      const refreshed = await tryRefresh();
      if (refreshed) return execute(true);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError({
        status: response.status,
        message: extractMessage(payload, `Request failed (${response.status})`),
      });
    }
    return payload as T;
  };

  return execute(false);
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_PREFIX}${path}`;
}
