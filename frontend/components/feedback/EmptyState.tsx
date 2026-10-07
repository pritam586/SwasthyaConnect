import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-elevated px-4 py-10 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-base text-muted">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-4 font-semibold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
