"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/use-async";
import { formatDate } from "@/lib/format";
import { patientService } from "@/services/patient.service";

export function PrescriptionsPanel() {
  const prescriptions = useAsync(() => patientService.prescriptions(), []);

  return (
    <div className="space-y-3">
      {prescriptions.status === "loading" ? <LoadingState /> : null}
      {prescriptions.status === "error" ? <ErrorState message={prescriptions.error ?? ""} onRetry={() => void prescriptions.reload()} /> : null}
      {prescriptions.status === "success" && prescriptions.data?.length === 0 ? (
        <EmptyState title="No prescriptions yet." description="Prescriptions from SwasthyaConnect doctors appear here." />
      ) : null}
      {(prescriptions.data ?? []).map((rx) => (
        <Card key={rx.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold">{rx.doctor_name}</h3>
            <p className="text-sm text-muted">{formatDate(rx.prescription_date)}</p>
          </div>
          {rx.diagnosis ? <p className="mt-1"><span className="font-semibold">Diagnosis:</span> {rx.diagnosis}</p> : null}
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
            {rx.medicines.map((med, index) => (
              <li key={`${med.name}-${index}`} className="p-3">
                <p className="font-semibold">{med.name}</p>
                <p className="text-sm text-muted">{med.dosage} · {med.frequency} · {med.duration}</p>
              </li>
            ))}
          </ul>
          {rx.instructions ? <p className="mt-2 text-sm">{rx.instructions}</p> : null}
          <Link
            href={`/pharmacies?${new URLSearchParams(rx.medicines.map((m) => ["med", m.name])).toString()}`}
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-teal"
          >
            Find these medicines nearby →
          </Link>
        </Card>
      ))}
    </div>
  );
}
