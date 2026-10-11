"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TextField } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAsync } from "@/hooks/use-async";
import { formatDate } from "@/lib/format";
import { patientService } from "@/services/patient.service";

export function MedicationsPanel() {
  const medications = useAsync(() => patientService.medications(), []);
  const [form, setForm] = useState({ medicine_name: "", dosage: "", frequency: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await patientService.addMedication({
        medicine_name: form.medicine_name,
        dosage: form.dosage || undefined,
        frequency: form.frequency || undefined,
      });
      medications.setData([created, ...(medications.data ?? [])]);
      setForm({ medicine_name: "", dosage: "", frequency: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the medication.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await patientService.deleteMedication(id);
    medications.setData((medications.data ?? []).filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-bold">Add a medication</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end" onSubmit={(e) => void add(e)}>
          <TextField label="Medicine" name="medicine_name" required minLength={2} value={form.medicine_name}
                     onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} />
          <TextField label="Dose" name="dosage" placeholder="1 tablet" value={form.dosage}
                     onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
          <TextField label="How often" name="frequency" placeholder="Once daily" value={form.frequency}
                     onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
          <Button type="submit" disabled={busy}>Add</Button>
        </form>
        {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
      </Card>
      {medications.status === "loading" ? <LoadingState /> : null}
      {medications.status === "error" ? <ErrorState message={medications.error ?? ""} onRetry={() => void medications.reload()} /> : null}
      {medications.status === "success" && medications.data?.length === 0 ? (
        <EmptyState title="No medications recorded." description="Add the medicines you take, or they appear here after a doctor prescribes them." />
      ) : null}
      <ul className="space-y-2">
        {(medications.data ?? []).map((med) => (
          <li key={med.id}>
            <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{med.medicine_name}</p>
                <p className="text-sm text-muted">{[med.dosage, med.frequency].filter(Boolean).join(" · ") || "Dose not recorded"}</p>
                {med.prescribed_by ? <p className="text-sm text-muted">Prescribed by {med.prescribed_by} · {formatDate(med.start_date)}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={med.status} />
                <Button type="button" variant="ghost" onClick={() => void remove(med.id)} aria-label={`Remove ${med.medicine_name}`}>
                  Remove
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
