export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function screeningConfidencePercent(raw: number): number {
  if (raw <= 1) return Math.round(raw * 1000) / 10;
  return Math.round(raw * 10) / 10;
}

export function isTruthyFlag(value: number | boolean | null | undefined): boolean {
  return value === true || value === 1;
}

export function displayOrDash(value: string | null | undefined): string {
  if (!value || !value.trim()) return "Not recorded";
  return value;
}
