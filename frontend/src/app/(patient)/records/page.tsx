"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportsPanel } from "@/features/medical-reports/ReportsPanel";
import { MedicationsPanel } from "@/features/medications/MedicationsPanel";
import { EncountersPanel } from "@/features/patient/EncountersPanel";
import { PrescriptionsPanel } from "@/features/prescriptions/PrescriptionsPanel";
import { useI18n } from "@/lib/i18n";

const TABS = [
  { id: "medications", label: "Medications", Panel: MedicationsPanel },
  { id: "encounters", label: "Past visits", Panel: EncountersPanel },
  { id: "prescriptions", label: "Prescriptions", Panel: PrescriptionsPanel },
  { id: "reports", label: "Reports", Panel: ReportsPanel },
] as const;

function Records() {
  const { t } = useI18n();
  const router = useRouter();
  const requested = useSearchParams().get("tab");
  const active = TABS.find((tab) => tab.id === requested) ?? TABS[0];

  return (
    <>
      <PageHeader title={t("navRecords")} />
      <div role="tablist" aria-label="Health records" className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={tab.id === active.id}
            onClick={() => router.replace(`/records?tab=${tab.id}`)}
            className={`min-h-11 shrink-0 rounded-xl px-4 font-semibold ${tab.id === active.id ? "bg-teal text-white" : "border border-line bg-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <active.Panel />
      </div>
    </>
  );
}

export default function RecordsPage() {
  return (
    <Suspense>
      <Records />
    </Suspense>
  );
}
