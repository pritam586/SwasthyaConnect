"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { DoctorVerificationPanel } from "@/features/admin/DoctorVerificationPanel";
import { PharmacyDataPanel } from "@/features/admin/PharmacyDataPanel";
import { UsersPanel } from "@/features/admin/UsersPanel";
import { useAsync } from "@/hooks/use-async";
import { adminService } from "@/services/admin.service";

export default function AdminPage() {
  const stats = useAsync(() => adminService.stats(), []);

  return (
    <>
      <PageHeader title="Administration" description="Admins manage accounts and data; they cannot open patients' medical records." />
      {stats.status === "error" ? <ErrorState message={stats.error ?? ""} onRetry={() => void stats.reload()} /> : null}
      {stats.data ? (
        <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(stats.data).map(([key, value]) => (
            <li key={key} className="rounded-2xl border border-line bg-elevated p-4">
              <p className="text-2xl font-bold text-teal-dark">{value}</p>
              <p className="text-sm text-muted">{key.replaceAll("_", " ")}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-5">
        <DoctorVerificationPanel />
        <PharmacyDataPanel />
        <UsersPanel />
      </div>
    </>
  );
}
