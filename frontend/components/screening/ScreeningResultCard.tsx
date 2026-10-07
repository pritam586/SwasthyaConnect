import { Card } from "@/components/common/Card";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { assetUrl } from "@/lib/api-client";
import { screeningConfidencePercent } from "@/lib/format";
import type { ScreeningAnalyzeResult } from "@/types/screening";

const nextStep: Record<string, string> = {
  GREEN: "Continue routine care. This screening is not a diagnosis.",
  YELLOW: "Consider seeing a clinician. Share this screening with a doctor.",
  RED: "Seek professional medical evaluation. Do not treat this as a diagnosis.",
};

export function ScreeningResultCard({ result }: { result: ScreeningAnalyzeResult }) {
  const heatmap = assetUrl(result.grad_cam_image_url);
  const level = String(result.triage_level).toUpperCase();
  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">Screening result</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge value={level} />
        <p className="text-lg font-bold text-ink">
          Screening result indicates: {result.screening_label.replaceAll("_", " ")}
        </p>
      </div>
      <p className="mt-3 text-base text-ink">{result.explanation}</p>
      {result.quality_passed ? (
        <p className="mt-2 text-sm text-muted">
          Reported confidence: {screeningConfidencePercent(result.confidence)}%. Confidence is a model score, not
          certainty of disease.
        </p>
      ) : (
        <p className="mt-2 font-medium text-amber-800">
          Image quality check failed: {result.quality_reason || "Please retake the photo."}
        </p>
      )}
      <p className="mt-3 font-medium text-ink">{nextStep[level] ?? "Speak with a qualified clinician."}</p>
      {heatmap ? (
        <figure className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heatmap} alt="Model attention overlay for the submitted eye image" className="w-full rounded-xl" />
          <figcaption className="mt-2 text-sm text-muted">
            Attention overlay returned by the screening service. It highlights regions the model used.
          </figcaption>
        </figure>
      ) : null}
      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{result.disclaimer}</p>
    </Card>
  );
}
