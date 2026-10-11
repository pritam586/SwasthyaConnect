"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { todayIso } from "@/lib/format";
import { appointmentService } from "@/services/appointment.service";
import type { Doctor } from "@/types/clinical";

export function BookingForm({ doctor, triageCaseId, onBooked }: {
  doctor: Doctor;
  triageCaseId?: string | null;
  onBooked: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await appointmentService.book({ doctor_id: doctor.id, slot_date: date, slot_time: time, notes: notes || undefined, triage_case_id: triageCaseId });
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-3 space-y-3 rounded-xl border border-line bg-white p-3" onSubmit={(e) => void submit(e)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Date" name={`date-${doctor.id}`} type="date" min={todayIso()} required value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Time" name={`time-${doctor.id}`} type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <TextAreaField label="Reason for visit (optional)" name={`notes-${doctor.id}`} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error ? <p className="text-sm font-medium text-red-700" role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy || !date}>{busy ? "Booking..." : "Request appointment"}</Button>
    </form>
  );
}
