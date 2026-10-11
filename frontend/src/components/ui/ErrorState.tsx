import { Button } from "@/components/common/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
      <p className="font-semibold text-red-800">We could not load this information.</p>
      <p className="mt-1 text-base text-red-800">{message}</p>
      {onRetry ? (
        <Button type="button" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
