"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookingForm } from "@/features/appointments/BookingForm";
import { AvailableDoctors } from "@/features/doctor/AvailableDoctors";
import { useAsync } from "@/hooks/use-async";
import { WEEKDAYS } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { doctorService } from "@/services/doctor.service";

function DoctorDirectory() {
  const { t } = useI18n();
  const caseId = useSearchParams().get("case");
  const doctors = useAsync(() => doctorService.list(), []);
  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);

  return (
    <>
      <PageHeader title={t("navDoctors")} description="Verified doctors. Those available now are listed first." />
      <div className="space-y-4">
        <AvailableDoctors triageCaseId={caseId} />
        {doctors.status === "loading" ? <LoadingState /> : null}
        {doctors.status === "error" ? <ErrorState message={doctors.error ?? ""} onRetry={() => void doctors.reload()} /> : null}
        {doctors.status === "success" && doctors.data?.length === 0 ? <EmptyState title="No verified doctors yet." /> : null}
        {booked ? (
          <p className="rounded-xl bg-green-50 p-3 font-semibold text-green-900" role="status">
            Appointment requested. <Link href="/appointments" className="text-teal underline">See my appointments</Link>
          </p>
        ) : null}
        {(doctors.data ?? []).map((doctor) => (
          <Card key={doctor.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">{doctor.name}</h2>
                <p className="text-muted">{doctor.specialization} · {doctor.qualification} · {doctor.experience_years} years</p>
                <p className="text-sm text-muted">{[doctor.clinic_name, doctor.location].filter(Boolean).join(", ")}</p>
                {doctor.availability.length ? (
                  <p className="mt-1 text-sm text-muted">
                    Hours: {doctor.availability.map((slot) => `${WEEKDAYS[slot.day_of_week].slice(0, 3)} ${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)}`).join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {doctor.available_now ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-900">Available now</span> : null}
                <Button type="button" variant="secondary" onClick={() => setBookingFor(bookingFor === doctor.id ? null : doctor.id)}>
                  {t("bookAppointment")}
                </Button>
              </div>
            </div>
            {bookingFor === doctor.id ? (
              <BookingForm doctor={doctor} triageCaseId={caseId} onBooked={() => { setBooked(doctor.id); setBookingFor(null); }} />
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense>
      <DoctorDirectory />
    </Suspense>
  );
}
