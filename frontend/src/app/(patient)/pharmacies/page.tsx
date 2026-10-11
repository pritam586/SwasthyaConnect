"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PharmacyFinder } from "@/features/pharmacy/PharmacyFinder";
import { useI18n } from "@/lib/i18n";

function Pharmacies() {
  const { t } = useI18n();
  const medicines = useSearchParams().getAll("med");
  return (
    <>
      <PageHeader title={t("pharmacyTitle")} description="Stock shown is what the pharmacy last recorded. Call before you travel." />
      <PharmacyFinder initialMedicines={medicines} />
    </>
  );
}

export default function PharmaciesPage() {
  return (
    <Suspense>
      <Pharmacies />
    </Suspense>
  );
}
