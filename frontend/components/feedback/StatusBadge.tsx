const tones: Record<string, string> = {
  GREEN: "bg-green-100 text-green-900",
  YELLOW: "bg-amber-100 text-amber-900",
  RED: "bg-red-100 text-red-900",
  green: "bg-green-100 text-green-900",
  yellow: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-900",
  AVAILABLE: "bg-green-100 text-green-900",
  LOW_STOCK: "bg-amber-100 text-amber-900",
  OUT_OF_STOCK: "bg-red-100 text-red-900",
  UNKNOWN: "bg-slate-100 text-slate-800",
  PROCESSED: "bg-green-100 text-green-900",
  PROCESSING: "bg-amber-100 text-amber-900",
  FAILED: "bg-red-100 text-red-900",
  UPLOADING: "bg-slate-100 text-slate-800",
  CONFIRMED: "bg-green-100 text-green-900",
  REQUESTED: "bg-amber-100 text-amber-900",
  CANCELLED: "bg-slate-100 text-slate-800",
  REJECTED: "bg-red-100 text-red-900",
  COMPLETED: "bg-teal-soft text-teal-dark",
  ACTIVE: "bg-teal-soft text-teal-dark",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const tone = tones[value] ?? "bg-slate-100 text-slate-800";
  const text = label ?? value.replaceAll("_", " ");
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ${tone}`}>
      {text}
    </span>
  );
}
