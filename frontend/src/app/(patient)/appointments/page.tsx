"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAsync } from "@/hooks/use-async";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { appointmentService } from "@/services/appointment.service";

export default function AppointmentsPage() {
  const { t } = useI18n();
  const appointments = useAsync(() => appointmentService.mine(), []);

  async function cancel(id: string) {
    const updated = await appointmentService.cancel(id);
    appointments.setData((appointments.data ?? []).map((a) => (a.id === id ? updated : a)));
  }

  return (
    <>
      <PageHeader title={t("navAppointments")} />
      {appointments.status === "loading" ? <LoadingState /> : null}
      {appointments.status === "error" ? <ErrorState message={appointments.error ?? ""} onRetry={() => void appointments.reload()} /> : null}
      {appointments.status === "success" && appointments.data?.length === 0 ? (
        <EmptyState title="No appointments yet." actionHref="/doctors" actionLabel={t("bookAppointment")} />
      ) : null}
      <ul className="space-y-3">
        {(appointments.data ?? []).map((appointment) => (
          <li key={appointment.id}>
            <Card>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{appointment.doctor_name}</p>
                  <p className="text-muted">
                    {formatDate(appointment.slot_date)} · {appointment.slot_time}
                    {appointment.appointment_type === "INSTANT" ? " · consultation request" : ""}
                  </p>
                  {appointment.notes ? <p className="text-sm text-muted">{appointment.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={appointment.status} />
                  {appointment.status === "REQUESTED" || appointment.status === "CONFIRMED" ? (
                    <Button type="button" variant="ghost" onClick={() => void cancel(appointment.id)}>Cancel</Button>
                  ) : null}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
