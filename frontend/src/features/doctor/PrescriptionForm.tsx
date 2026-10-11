"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { clinicalService } from "@/services/clinical.service";
import type { ClinicalCase, PrescriptionMedicine } from "@/types/clinical";

const EMPTY_MEDICINE: PrescriptionMedicine = { name: "", dosage: "", frequency: "", duration: "" };

/** The doctor writes the diagnosis and every medicine; nothing is pre-filled. */
export function PrescriptionForm({ caseId, onIssued }: { caseId: string; onIssued: (updated: ClinicalCase) => void }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([{ ...EMPTY_MEDICINE }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMedicine = (index: number, field: keyof PrescriptionMedicine, value: string) =>
    setMedicines((current) => current.map((m, i) => (i === index ? { ...m, [field]: value } : m)));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onIssued(await clinicalService.prescribe(caseId, { diagnosis, clinical_notes: notes || undefined, medicines }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The prescription could not be issued.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={(e) => void submit(e)}>
      <TextField label="Diagnosis" name="diagnosis" required minLength={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Medicines</legend>
        {medicines.map((medicine, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2">
            <TextField label="Medicine" name={`med-${index}-name`} required minLength={2} value={medicine.name}
                       onChange={(e) => setMedicine(index, "name", e.target.value)} />
            <TextField label="Dose" name={`med-${index}-dosage`} required placeholder="1 tablet" value={medicine.dosage}
                       onChange={(e) => setMedicine(index, "dosage", e.target.value)} />
            <TextField label="How often" name={`med-${index}-frequency`} required placeholder="Once daily after food" value={medicine.frequency}
                       onChange={(e) => setMedicine(index, "frequency", e.target.value)} />
            <TextField label="Duration" name={`med-${index}-duration`} required placeholder="30 days" value={medicine.duration}
                       onChange={(e) => setMedicine(index, "duration", e.target.value)} />
            {medicines.length > 1 ? (
              <Button type="button" variant="ghost" onClick={() => setMedicines(medicines.filter((_, i) => i !== index))}>
                Remove medicine
              </Button>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setMedicines([...medicines, { ...EMPTY_MEDICINE }])}>
          Add another medicine
        </Button>
      </fieldset>
      <TextAreaField label="Instructions for the patient (optional)" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Issuing..." : "Issue prescription"}</Button>
    </form>
  );
}
