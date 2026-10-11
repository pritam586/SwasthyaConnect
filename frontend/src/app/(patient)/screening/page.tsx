"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ScreeningFlow } from "@/features/screening/ScreeningFlow";
import { useI18n } from "@/lib/i18n";

export default function ScreeningPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("navScreening")} description={t("responsibleAiBody")} />
      <ScreeningFlow />
    </>
  );
}
