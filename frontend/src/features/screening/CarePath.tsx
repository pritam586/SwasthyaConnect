"use client";

import Link from "next/link";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { Card } from "@/components/ui/Card";
import { AvailableDoctors } from "@/features/doctor/AvailableDoctors";
import { useI18n } from "@/lib/i18n";
import type { TriageResult } from "@/types/clinical";

const STYLES = {
  green: "border-green-300 bg-green-50",
  yellow: "border-amber-300 bg-amber-50",
  red: "border-red-400 bg-red-50",
};

/** What to do next, by urgency. Red always shows the emergency number first. */
export function CarePath({ triage }: { triage: TriageResult }) {
  const { t } = useI18n();
  const heading = { green: t("urgencyGreen"), yellow: t("urgencyYellow"), red: t("urgencyRed") }[triage.urgency];

  return (
    <div className="space-y-4">
      {triage.urgency === "red" ? (
        <a href="tel:108" className="flex min-h-14 items-center justify-center rounded-2xl bg-red-700 px-4 text-center text-lg font-bold text-white">
          {t("emergencyCall")}
        </a>
      ) : null}
      <Card className={STYLES[triage.urgency]}>
        <h2 className="text-xl font-bold">{heading}</h2>
        <p className="mt-2">{triage.summary}</p>
        <p className="mt-1 text-sm text-muted">{triage.explanation}</p>
      </Card>

      {triage.urgency === "green" ? (
        <Card>
          <h3 className="font-bold">{t("selfCareTitle")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t("diet1")}</li>
            <li>{t("diet2")}</li>
            <li>{t("diet3")}</li>
            <li>{t("diet4")}</li>
          </ul>
          <Link href="/pharmacies" className="mt-4 inline-flex min-h-12 items-center font-semibold text-teal">
            {t("findPharmacy")} →
          </Link>
        </Card>
      ) : (
        <>
          <AvailableDoctors triageCaseId={triage.id} />
          <Link
            href={`/doctors?case=${encodeURIComponent(triage.id)}`}
            className="inline-flex min-h-12 items-center rounded-xl border border-line bg-white px-4 font-semibold"
          >
            {t("bookAppointment")}
          </Link>
        </>
      )}
      <Disclaimer text={triage.disclaimer} />
    </div>
  );
}
