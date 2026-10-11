"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/LoadingState";
import { CameraCapture } from "@/features/screening/CameraCapture";
import { CarePath } from "@/features/screening/CarePath";
import { ScreeningResultView } from "@/features/screening/ScreeningResultView";
import { SymptomQuestions } from "@/features/screening/SymptomQuestions";
import { useI18n } from "@/lib/i18n";
import { screeningService } from "@/services/screening.service";
import { triageService } from "@/services/triage.service";
import { ApiError } from "@/types/api";
import type { Screening, TriageResult } from "@/types/clinical";

type Step = "consent" | "capture" | "preview" | "analyzing" | "result" | "symptoms" | "triage";

export function ScreeningFlow() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("consent");
  const [consents, setConsents] = useState([false, false, false]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function choosePhoto(file: File) {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setStep("preview");
  }

  async function analyze() {
    if (!photo) return;
    setStep("analyzing");
    setError(null);
    setNotice(null);
    try {
      const result = await screeningService.analyze(photo);
      if (!result.quality_passed) {
        // Failed quality gate: nothing was stored; the patient retakes the photo.
        setNotice(result.quality_reason ?? t("inconclusive"));
        setStep("capture");
        return;
      }
      setScreening(result);
      setStep("result");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        // No model or ML service: say so and continue without a screening result.
        setNotice(t("screeningUnavailable"));
        setScreening(null);
        setStep("symptoms");
        return;
      }
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStep("preview");
    }
  }

  async function submitSymptoms(statements: string[]) {
    setBusy(true);
    setError(null);
    try {
      setTriage(await triageService.create(statements, screening?.id ?? null));
      setStep("triage");
    } catch (err) {
      // Never invent a result: show the failure and let the patient retry.
      setError(err instanceof Error ? err.message : "The triage service could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  const photoAllowed = consents[1];

  return (
    <div className="space-y-4">
      {notice ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950" role="status">{notice}</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</p> : null}

      {step === "consent" ? (
        <Card>
          <h2 className="text-xl font-bold">{t("consentTitle")}</h2>
          <div className="mt-3 space-y-2">
            {(["consent1", "consent2", "consent3"] as const).map((key, index) => (
              <label key={key} className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={consents[index]}
                  onChange={(event) => setConsents((current) => current.map((v, i) => (i === index ? event.target.checked : v)))}
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" disabled={!consents[0]} onClick={() => setStep(photoAllowed ? "capture" : "symptoms")}>
              {t("acceptConsent")}
            </Button>
          </div>
          {!photoAllowed && consents[0] ? (
            <p className="mt-2 text-sm text-muted">Without consent for photo analysis, only the symptom questions are used.</p>
          ) : null}
        </Card>
      ) : null}

      {step === "capture" ? (
        <Card>
          <h2 className="mb-3 text-xl font-bold">{t("eyeScanTitle")}</h2>
          <CameraCapture onImage={choosePhoto} />
        </Card>
      ) : null}

      {step === "preview" && preview ? (
        <Card>
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={preview} alt="Eye photo preview" className="w-full max-w-md rounded-xl" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void analyze()}>{t("analyze")}</Button>
            <Button type="button" variant="secondary" onClick={() => setStep("capture")}>{t("retake")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "analyzing" ? (
        <Card>
          <Spinner label={t("analyzing")} />
        </Card>
      ) : null}

      {step === "result" && screening ? (
        <>
          <ScreeningResultView result={screening} />
          <Button type="button" className="w-full" onClick={() => setStep("symptoms")}>{t("continueToSymptoms")}</Button>
        </>
      ) : null}

      {step === "symptoms" ? (
        <>
          <h2 className="text-xl font-bold">{t("symptomTitle")}</h2>
          <SymptomQuestions busy={busy} onSubmit={(statements) => void submitSymptoms(statements)} />
        </>
      ) : null}

      {step === "triage" && triage ? <CarePath triage={triage} /> : null}
    </div>
  );
}
