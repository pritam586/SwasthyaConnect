"use client";

import { useI18n } from "@/lib/i18n";

/** Shown wherever a screening or triage result appears. */
export function Disclaimer({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="note">
      <p className="font-bold">{t("responsibleAiTitle")}</p>
      <p className="mt-1 text-sm">{text ?? t("responsibleAiBody")}</p>
    </aside>
  );
}
