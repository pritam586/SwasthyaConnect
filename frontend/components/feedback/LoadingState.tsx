export function LoadingState({ label = "Loading your health information…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="grid gap-3">
        <div className="h-24 animate-pulse rounded-2xl bg-[#e6e0d4]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[#e6e0d4]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[#e6e0d4]" />
      </div>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-teal" role="status">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      <span className="font-medium">{label}</span>
    </div>
  );
}
