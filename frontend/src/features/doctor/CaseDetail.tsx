"use client";

import { ProtectedImage } from "@/components/shared/ProtectedImage";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrescriptionForm } from "@/features/doctor/PrescriptionForm";
import { formatDateTime, screeningLabelText } from "@/lib/format";
import type { ClinicalCase } from "@/types/clinical";

export function CaseDetail({ item, onUpdated }: { item: ClinicalCase; onUpdated: (updated: ClinicalCase) => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{item.patient_name}</h2>
          <StatusBadge value={item.urgency} label={`${item.urgency.toUpperCase()} priority`} />
        </div>
        <p className="text-muted">
          {[item.age ? `${item.age} yrs` : null, item.gender, item.location].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm text-muted">ABHA: {item.abha_id ?? "not linked"} · Submitted {formatDateTime(item.created_at)}</p>
      </Card>

      <Card>
        <h3 className="font-bold">Symptoms reported</h3>
        <ul className="mt-2 list-disc pl-5">{item.symptoms.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="mt-3 rounded-xl bg-teal-soft p-3">{item.summary}</p>
        <p className="mt-1 text-sm text-muted">{item.explanation} Rule-based triage, not a diagnosis.</p>
      </Card>

      <Card>
        <h3 className="font-bold">Eye screening</h3>
        {item.screening ? (
          <>
            <p className="mt-1">
              {screeningLabelText(item.screening.screening_label)} · {item.screening.confidence.toFixed(1)}% · {item.screening.model_version}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {item.screening.image_file_id ? (
                <figure>
                  <ProtectedImage fileId={item.screening.image_file_id} alt="Patient eye photo" className="w-full rounded-xl" />
                  <figcaption className="mt-1 text-sm text-muted">Photo</figcaption>
                </figure>
              ) : null}
              {item.screening.heatmap_file_id ? (
                <figure>
                  <ProtectedImage fileId={item.screening.heatmap_file_id} alt="Grad-CAM heatmap" className="w-full rounded-xl" />
                  <figcaption className="mt-1 text-sm text-muted">Grad-CAM: regions that influenced the model</figcaption>
                </figure>
              ) : null}
            </div>
          </>
        ) : (
          <p className="mt-1 text-muted">No usable screening result for this case.</p>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 font-bold">Decision</h3>
        {item.status === "reviewed" ? (
          <div>
            <p><span className="font-semibold">Diagnosis:</span> {item.diagnosis}</p>
            {item.clinical_notes ? <p className="mt-1">{item.clinical_notes}</p> : null}
            <p className="mt-2 text-sm text-green-800">Prescription issued and added to the patient&apos;s record.</p>
          </div>
        ) : (
          <PrescriptionForm caseId={item.id} onIssued={onUpdated} />
        )}
      </Card>
    </div>
  );
}
