"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAsync } from "@/hooks/use-async";
import { useI18n } from "@/lib/i18n";
import { appointmentService } from "@/services/appointment.service";
import { doctorService } from "@/services/doctor.service";

/** Verified doctors who are available right now, with a one-tap consultation request. */
export function AvailableDoctors({ triageCaseId }: { triageCaseId?: string | null }) {
  const { t } = useI18n();
  const doctors = useAsync(() => doctorService.list(true), []);
  const [requested, setRequested] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(doctorId: string) {
    setError(null);
    try {
      await appointmentService.requestNow({ doctor_id: doctorId, triage_case_id: triageCaseId });
      setRequested(doctorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request could not be sent.");
    }
  }

  return (
    <Card>
      <h3 className="font-bold">{t("connectDoctor")}</h3>
      {doctors.status === "loading" ? <p className="mt-2 text-muted">{t("loading")}</p> : null}
      {doctors.status === "error" ? <p className="mt-2 text-red-700">{doctors.error}</p> : null}
      {doctors.status === "success" && (doctors.data ?? []).length === 0 ? (
        <p className="mt-2 text-muted">No doctor is available right now. Book an appointment instead.</p>
      ) : null}
      <ul className="mt-2 space-y-2">
        {(doctors.data ?? []).map((doctor) => (
          <li key={doctor.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{doctor.name}</p>
              <p className="text-sm text-muted">{doctor.specialization} · {doctor.qualification}</p>
            </div>
            {requested === doctor.id ? (
              <p className="font-semibold text-green-800">Request sent. The doctor will confirm.</p>
            ) : (
              <Button type="button" onClick={() => void request(doctor.id)} disabled={requested !== null}>
                Request consultation
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
      <p className="mt-3 text-sm text-muted">The doctor confirms the request and contacts you. Video calling is not built into the app yet.</p>
    </Card>
  );
}
