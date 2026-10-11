"use client";

import { useState } from "react";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { ProtectedImage } from "@/components/shared/ProtectedImage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n";
import type { Screening } from "@/types/clinical";

export function ScreeningResultView({ result }: { result: Screening }) {
  const { t } = useI18n();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const title =
    result.screening_label === "anemia_likely"
      ? t("pallorDetected")
      : result.screening_label === "anemia_unlikely"
        ? t("normalErythema")
        : t("inconclusive");
  const tone =
    result.screening_label === "anemia_likely"
      ? "border-amber-300 bg-amber-50"
      : result.screening_label === "anemia_unlikely"
        ? "border-green-300 bg-green-50"
        : "border-line bg-white";

  return (
    <div className="space-y-4">
      <Card className={tone}>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-muted">
          {t("confidence")}: {result.confidence.toFixed(1)}%
        </p>
        {result.explanation ? <p className="mt-2">{result.explanation}</p> : null}
        {result.model_version ? <p className="mt-2 text-xs text-muted">Model: {result.model_version}</p> : null}
      </Card>
      {result.heatmap_file_id ? (
        <Card>
          <Button type="button" variant="secondary" onClick={() => setShowHeatmap((value) => !value)}>
            {showHeatmap ? t("hideHeatmap") : t("showHeatmap")}
          </Button>
          {showHeatmap ? (
            <div className="mt-3">
              <ProtectedImage fileId={result.heatmap_file_id} alt="Grad-CAM heatmap of the eye photo" className="w-full max-w-sm rounded-xl" />
              <p className="mt-2 text-sm text-muted">Red areas influenced the model most. This is an explanation aid, not a finding.</p>
            </div>
          ) : null}
        </Card>
      ) : null}
      <Disclaimer text={result.disclaimer} />
    </div>
  );
}
