import type { ScreeningLabel } from "@/types/clinical";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function parse(value: string): Date | null {
  // Plain dates ("2026-10-20") are calendar days, not UTC midnights.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = parse(value);
  return date ? dateFormat.format(date) : value;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = parse(value);
  return date ? dateTimeFormat.format(date) : value;
}

export function formatDistanceKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function screeningLabelText(label: ScreeningLabel): string {
  if (label === "anemia_likely") return "Pallor flagged";
  if (label === "anemia_unlikely") return "No pallor flagged";
  return "Inconclusive";
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
