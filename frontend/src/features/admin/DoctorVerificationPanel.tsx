"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAsync } from "@/hooks/use-async";
import { adminService } from "@/services/admin.service";

export function DoctorVerificationPanel() {
  const [filter, setFilter] = useState<"PENDING" | "VERIFIED" | "REJECTED">("PENDING");
  const doctors = useAsync(() => adminService.doctors(filter), [filter]);

  async function decide(id: string, status: "VERIFIED" | "REJECTED") {
    await adminService.verifyDoctor(id, status);
    doctors.setData((doctors.data ?? []).filter((d) => d.id !== id));
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Doctor verification</h2>
        <select aria-label="Show" className="min-h-11 rounded-xl border border-line bg-white px-2" value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      <p className="mt-1 text-sm text-muted">Check each registration number with the medical council register before verifying.</p>
      {doctors.status === "success" && doctors.data?.length === 0 ? <p className="mt-3 text-muted">None.</p> : null}
      {doctors.status === "error" ? <p className="mt-3 text-red-700">{doctors.error}</p> : null}
      <ul className="mt-3 divide-y divide-line">
        {(doctors.data ?? []).map((doctor) => (
          <li key={doctor.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{doctor.name}</p>
              <p className="text-sm text-muted">
                {doctor.qualification} · {doctor.specialization} · Reg. {doctor.license_number} · {doctor.location}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={doctor.verification_status === "VERIFIED" ? "CONFIRMED" : doctor.verification_status === "REJECTED" ? "REJECTED" : "REQUESTED"}
                           label={doctor.verification_status} />
              {doctor.verification_status !== "VERIFIED" ? <Button type="button" onClick={() => void decide(doctor.id, "VERIFIED")}>Verify</Button> : null}
              {doctor.verification_status !== "REJECTED" ? (
                <Button type="button" variant="secondary" onClick={() => void decide(doctor.id, "REJECTED")}>Reject</Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
