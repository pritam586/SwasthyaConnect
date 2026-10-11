"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/use-async";
import { formatDate, todayIso } from "@/lib/format";
import { patientService } from "@/services/patient.service";

export function EncountersPanel() {
  const encounters = useAsync(() => patientService.encounters(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ encounter_date: todayIso(), reason: "", doctor_name: "", diagnosis_notes: "" });
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await patientService.addEncounter({
        encounter_date: form.encounter_date,
        reason: form.reason,
        doctor_name: form.doctor_name || undefined,
        diagnosis_notes: form.diagnosis_notes || undefined,
      });
      encounters.setData([created, ...(encounters.data ?? [])]);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the visit.");
    }
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="secondary" onClick={() => setOpen(!open)}>{open ? "Close" : "Record a past visit"}</Button>
      {open ? (
        <Card>
          <form className="space-y-3" onSubmit={(e) => void add(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Date" name="encounter_date" type="date" max={todayIso()} required value={form.encounter_date}
                         onChange={(e) => setForm({ ...form, encounter_date: e.target.value })} />
              <TextField label="Doctor or clinic" name="doctor_name" value={form.doctor_name}
                         onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
            </div>
            <TextField label="Reason for visit" name="reason" required minLength={3} value={form.reason}
                       onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <TextAreaField label="What the doctor said (optional)" name="diagnosis_notes" value={form.diagnosis_notes}
                           onChange={(e) => setForm({ ...form, diagnosis_notes: e.target.value })} />
            {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
            <Button type="submit">Save visit</Button>
          </form>
        </Card>
      ) : null}
      {encounters.status === "loading" ? <LoadingState /> : null}
      {encounters.status === "error" ? <ErrorState message={encounters.error ?? ""} onRetry={() => void encounters.reload()} /> : null}
      {encounters.status === "success" && encounters.data?.length === 0 ? <EmptyState title="No visits recorded yet." /> : null}
      <ul className="space-y-2">
        {(encounters.data ?? []).map((visit) => (
          <li key={visit.id}>
            <Card>
              <p className="font-semibold">{visit.reason}</p>
              <p className="text-sm text-muted">{formatDate(visit.encounter_date)}{visit.doctor_name ? ` · ${visit.doctor_name}` : ""}</p>
              {visit.diagnosis_notes ? <p className="mt-1">{visit.diagnosis_notes}</p> : null}
              {visit.treatment_notes ? <p className="mt-1 text-sm text-muted">{visit.treatment_notes}</p> : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
