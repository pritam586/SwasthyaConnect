"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CaseDetail } from "@/features/doctor/CaseDetail";
import { useDoctorVerified, VerificationNotice } from "@/features/doctor/VerificationNotice";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime } from "@/lib/format";
import { clinicalService } from "@/services/clinical.service";

export default function CaseQueuePage() {
  const verified = useDoctorVerified();
  const [filter, setFilter] = useState<"pending" | "reviewed">("pending");
  const cases = useAsync(() => (verified ? clinicalService.cases(filter) : Promise.resolve([])), [verified, filter]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = cases.data?.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      <PageHeader title="Case queue" description="Red cases first, then yellow, then green; oldest first within each." />
      <VerificationNotice />
      {verified ? (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["pending", "reviewed"] as const).map((value) => (
                <button key={value} type="button" onClick={() => { setFilter(value); setSelectedId(null); }}
                        className={`min-h-11 rounded-xl px-4 font-semibold ${filter === value ? "bg-teal text-white" : "border border-line bg-white"}`}>
                  {value === "pending" ? "To review" : "Reviewed"}
                </button>
              ))}
            </div>
            {cases.status === "loading" ? <LoadingState label="Loading cases..." /> : null}
            {cases.status === "error" ? <ErrorState message={cases.error ?? ""} onRetry={() => void cases.reload()} /> : null}
            {cases.status === "success" && cases.data?.length === 0 ? <EmptyState title="No cases here." /> : null}
            <ul className="space-y-2">
              {(cases.data ?? []).map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelectedId(item.id)} className="w-full text-left">
                    <Card className={selectedId === item.id ? "ring-2 ring-teal" : ""}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{item.patient_name}</p>
                        <StatusBadge value={item.urgency} label={item.urgency.toUpperCase()} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(item.created_at)}</p>
                    </Card>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {selected ? (
              <CaseDetail
                item={selected}
                onUpdated={(updated) => cases.setData((cases.data ?? []).map((c) => (c.id === updated.id ? updated : c)))}
              />
            ) : (
              <EmptyState title="Select a case to review." />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
