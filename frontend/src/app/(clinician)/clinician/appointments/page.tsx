"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDoctorVerified, VerificationNotice } from "@/features/doctor/VerificationNotice";
import { useAsync } from "@/hooks/use-async";
import { formatDate } from "@/lib/format";
import { appointmentService } from "@/services/appointment.service";

const ACTIONS = {
  REQUESTED: [["CONFIRMED", "Confirm"], ["REJECTED", "Decline"]],
  CONFIRMED: [["COMPLETED", "Mark completed"]],
} as const;

export default function ClinicianAppointmentsPage() {
  const verified = useDoctorVerified();
  const appointments = useAsync(() => (verified ? appointmentService.forDoctor() : Promise.resolve([])), [verified]);

  async function update(id: string, status: "CONFIRMED" | "REJECTED" | "COMPLETED") {
    const updated = await appointmentService.setStatus(id, status);
    appointments.setData((appointments.data ?? []).map((a) => (a.id === id ? updated : a)));
  }

  return (
    <>
      <PageHeader title="Appointments" />
      <VerificationNotice />
      {appointments.status === "loading" ? <LoadingState /> : null}
      {appointments.status === "error" ? <ErrorState message={appointments.error ?? ""} onRetry={() => void appointments.reload()} /> : null}
      {verified && appointments.status === "success" && appointments.data?.length === 0 ? <EmptyState title="No appointments yet." /> : null}
      <ul className="space-y-3">
        {(appointments.data ?? []).map((appointment) => (
          <li key={appointment.id}>
            <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{appointment.patient_name}</p>
                <p className="text-muted">
                  {formatDate(appointment.slot_date)} · {appointment.slot_time}
                  {appointment.appointment_type === "INSTANT" ? " · requested now" : ""}
                </p>
                {appointment.notes ? <p className="text-sm text-muted">{appointment.notes}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={appointment.status} />
                {(ACTIONS[appointment.status as keyof typeof ACTIONS] ?? []).map(([status, label]) => (
                  <Button key={status} type="button" variant={status === "REJECTED" ? "secondary" : "primary"}
                          onClick={() => void update(appointment.id, status)}>
                    {label}
                  </Button>
                ))}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
