"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { openProtectedFile } from "@/components/shared/ProtectedImage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TextField } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/use-async";
import { formatDate } from "@/lib/format";
import { reportService } from "@/services/report.service";

const MAX_MB = 10;

export function ReportsPanel() {
  const reports = useAsync(() => reportService.list(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`The file is larger than ${MAX_MB} MB.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await reportService.upload(file, title || file.name, "Lab report");
      reports.setData([created, ...(reports.data ?? [])]);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await reportService.remove(id);
    reports.setData((reports.data ?? []).filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-bold">Upload a report or prescription</h2>
        <form className="mt-3 space-y-3" onSubmit={(e) => void upload(e)}>
          <TextField label="Title" name="report_title" placeholder="e.g. Blood test, March" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-base file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-teal-soft file:px-3 file:font-semibold"
          />
          <p className="text-sm text-muted">PDF, JPG, PNG or WebP, up to {MAX_MB} MB. Medicines are read from PDFs with text; photos are stored but not read.</p>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <Button type="submit" disabled={!file || busy}>{busy ? "Uploading..." : "Upload"}</Button>
        </form>
      </Card>
      {reports.status === "loading" ? <LoadingState /> : null}
      {reports.status === "error" ? <ErrorState message={reports.error ?? ""} onRetry={() => void reports.reload()} /> : null}
      {reports.status === "success" && reports.data?.length === 0 ? <EmptyState title="No reports uploaded yet." /> : null}
      {(reports.data ?? []).map((report) => (
        <Card key={report.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-bold">{report.report_title}</h3>
              <p className="text-sm text-muted">{report.original_file_name} · {formatDate(report.created_at)}</p>
              {report.summary ? <p className="mt-1">{report.summary}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => void openProtectedFile(report.file_id)}>Open</Button>
              <Button type="button" variant="ghost" onClick={() => void remove(report.id)}>Delete</Button>
            </div>
          </div>
          {report.extracted_medicines.length ? (
            <Link
              href={`/pharmacies?${new URLSearchParams(report.extracted_medicines.map((m) => ["med", m.name])).toString()}`}
              className="mt-2 inline-flex min-h-11 items-center font-semibold text-teal"
            >
              Find {report.extracted_medicines.map((m) => m.name).join(", ")} nearby →
            </Link>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
