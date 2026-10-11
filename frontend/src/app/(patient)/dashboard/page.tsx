"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/auth-provider";
import { NotificationList } from "@/features/patient/NotificationList";
import { useAsync } from "@/hooks/use-async";
import { formatDate, screeningLabelText } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { patientService } from "@/services/patient.service";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const summary = useAsync(() => patientService.dashboard(), []);

  return (
    <>
      <PageHeader title={`${t("navHome")}: ${user?.name ?? ""}`} />
      <Link
        href="/screening"
        className="mb-5 flex min-h-14 items-center justify-center rounded-2xl bg-teal px-5 text-lg font-semibold text-white"
      >
        {t("startScreening")}
      </Link>

      {summary.status === "loading" ? <LoadingState /> : null}
      {summary.status === "error" ? <ErrorState message={summary.error ?? ""} onRetry={() => void summary.reload()} /> : null}
      {summary.data ? (
        <div className="space-y-5">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Medications", summary.data.active_medications, "/records?tab=medications"],
              ["Visits", summary.data.encounters, "/records?tab=encounters"],
              ["Prescriptions", summary.data.prescriptions, "/records?tab=prescriptions"],
              ["Reports", summary.data.reports, "/records?tab=reports"],
            ].map(([label, count, href]) => (
              <li key={label as string}>
                <Link href={href as string} className="block rounded-2xl border border-line bg-elevated p-4 hover:bg-teal-soft">
                  <p className="text-3xl font-bold text-teal-dark">{count as number}</p>
                  <p className="text-sm font-semibold text-muted">{label as string}</p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="font-bold">Next appointment</h2>
              {summary.data.upcoming_appointment ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p>
                    {summary.data.upcoming_appointment.doctor_name} · {formatDate(summary.data.upcoming_appointment.slot_date)}{" "}
                    {summary.data.upcoming_appointment.slot_time}
                  </p>
                  <StatusBadge value={summary.data.upcoming_appointment.status} />
                </div>
              ) : (
                <p className="mt-2 text-muted">No upcoming appointment. <Link href="/doctors" className="font-semibold text-teal">Find a doctor</Link></p>
              )}
            </Card>
            <Card>
              <h2 className="font-bold">Latest eye screening</h2>
              {summary.data.latest_screening ? (
                <p className="mt-2">
                  {screeningLabelText(summary.data.latest_screening.screening_label)} ·{" "}
                  {summary.data.latest_screening.confidence.toFixed(1)}% · {formatDate(summary.data.latest_screening.created_at)}
                </p>
              ) : (
                <p className="mt-2 text-muted">No screening yet.</p>
              )}
            </Card>
          </div>
          <NotificationList />
        </div>
      ) : null}
    </>
  );
}
