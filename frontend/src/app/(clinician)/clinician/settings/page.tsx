"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDoctorVerified, VerificationNotice } from "@/features/doctor/VerificationNotice";
import { useAsync } from "@/hooks/use-async";
import { WEEKDAYS } from "@/lib/format";
import { doctorService } from "@/services/doctor.service";
import type { AvailabilitySlot } from "@/types/clinical";

export default function AvailabilitySettingsPage() {
  const verified = useDoctorVerified();
  const me = useAsync(() => doctorService.me(), []);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me.data) setSlots(me.data.availability.map((s) => ({ ...s, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) })));
  }, [me.data]);

  async function toggleOnline() {
    if (!me.data) return;
    setError(null);
    try {
      me.setData(await doctorService.setOnline(!me.data.is_online));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  async function saveSlots() {
    setError(null);
    setMessage(null);
    try {
      me.setData(await doctorService.setAvailability(slots));
      setMessage("Weekly hours saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save hours.");
    }
  }

  if (me.status === "loading") return <LoadingState />;
  if (me.status === "error" || !me.data) return <ErrorState message={me.error ?? ""} onRetry={() => void me.reload()} />;

  return (
    <>
      <PageHeader title="Availability" description={`${me.data.name} · registration ${me.data.license_number}`} />
      <VerificationNotice />
      {verified ? (
        <div className="space-y-4">
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">{me.data.is_online ? "You are available now" : "You are offline"}</p>
              <p className="text-sm text-muted">Patients can request a consultation while you are available. Status turns off after 15 minutes without activity.</p>
            </div>
            <Button type="button" variant={me.data.is_online ? "secondary" : "primary"} onClick={() => void toggleOnline()}>
              {me.data.is_online ? "Go offline" : "I'm available now"}
            </Button>
          </Card>
          <Card>
            <h2 className="font-bold">Weekly consulting hours</h2>
            <p className="text-sm text-muted">Patients see you as available during these hours (clinic time zone).</p>
            <ul className="mt-3 space-y-2">
              {slots.map((slot, index) => (
                <li key={index} className="flex flex-wrap items-center gap-2">
                  <select aria-label="Day" className="min-h-11 rounded-xl border border-line bg-white px-2" value={slot.day_of_week}
                          onChange={(e) => setSlots(slots.map((s, i) => (i === index ? { ...s, day_of_week: Number(e.target.value) } : s)))}>
                    {WEEKDAYS.map((day, value) => <option key={day} value={value}>{day}</option>)}
                  </select>
                  <input aria-label="Start" type="time" className="min-h-11 rounded-xl border border-line bg-white px-2" value={slot.start_time}
                         onChange={(e) => setSlots(slots.map((s, i) => (i === index ? { ...s, start_time: e.target.value } : s)))} />
                  <span>to</span>
                  <input aria-label="End" type="time" className="min-h-11 rounded-xl border border-line bg-white px-2" value={slot.end_time}
                         onChange={(e) => setSlots(slots.map((s, i) => (i === index ? { ...s, end_time: e.target.value } : s)))} />
                  <Button type="button" variant="ghost" onClick={() => setSlots(slots.filter((_, i) => i !== index))}>Remove</Button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setSlots([...slots, { day_of_week: 0, start_time: "09:00", end_time: "13:00" }])}>
                Add hours
              </Button>
              <Button type="button" onClick={() => void saveSlots()}>Save hours</Button>
            </div>
          </Card>
          {message ? <p className="text-green-800" role="status">{message}</p> : null}
          {error ? <p className="text-red-700" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </>
  );
}
