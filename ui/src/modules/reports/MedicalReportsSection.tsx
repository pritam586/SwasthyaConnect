import React, { useState, useEffect, useRef } from "react"
import { translations, Language } from "../../i18n"
import {
  uploadMedicalReport,
  fetchUserReports,
  MedicalReportRecord,
  ExtractedMedicine,
} from "./reportsService"
import { UserProfile } from "../auth/authService"

interface MedicalReportsSectionProps {
  user: UserProfile
  lang: Language
  onFindMedicine: (medicineName: string) => void
  onFindAllMedicines: (medicines: string[]) => void
}

export function MedicalReportsSection({
  user,
  lang,
  onFindMedicine,
  onFindAllMedicines,
}: MedicalReportsSectionProps) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reports, setReports] = useState<MedicalReportRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const loadReports = async () => {
    try {
      const data = await fetchUserReports(user.id)
      setReports(data)
    } catch (e) {
      console.warn("Could not load reports", e)
    }
  }

  useEffect(() => {
    loadReports()
  }, [user.id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadSuccess(null)
    setUploadError(null)

    try {
      const uploaded = await uploadMedicalReport(
        user.id,
        user.name,
        file.name.replace(/\.[^/.]+$/, ""),
        file
      )
      setUploadSuccess(t("reportUploadedSuccess"))
      await loadReports()
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-black text-xs text-slate-800 uppercase tracking-wider">
            {t("myReports")}
          </h3>
          <p className="text-[11px] text-slate-400">PDF, JPG, PNG (Max 10 MB)</p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          {uploading ? (
            <span>⏳ Uploading...</span>
          ) : (
            <>
              <span>📄</span>
              <span>Upload Report</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {uploadSuccess && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>✓ {uploadSuccess}</span>
          <button onClick={() => setUploadSuccess(null)} className="text-emerald-600 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center justify-between">
          <span>✗ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-600 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-2.5 pt-1">
        {reports.length === 0 ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            No medical reports uploaded yet. Upload a prescription or lab report to find medicines nearby.
          </div>
        ) : (
          reports.map((report) => {
            const meds = report.extracted_medicines || []
            return (
              <div
                key={report.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {report.file_type.includes("pdf") ? "📑" : "🖼️"}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-slate-800">{report.report_title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {report.file_name} · {report.created_at?.split("T")[0] || "Recent"}
                      </div>
                    </div>
                  </div>
                  {meds.length > 0 && (
                    <button
                      onClick={() => onFindAllMedicines(meds.map((m) => m.name))}
                      className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-[10px] font-bold transition whitespace-nowrap"
                    >
                      📍 Find All ({meds.length})
                    </button>
                  )}
                </div>

                {report.ai_summary && (
                  <div className="text-[11px] text-teal-900 bg-teal-50/70 p-2 rounded-lg border border-teal-100 leading-tight">
                    {report.ai_summary}
                  </div>
                )}

                {/* Extracted medicines list */}
                {meds.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      {t("extractedMedicines")}:
                    </div>
                    {meds.map((med, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{med.name}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">
                            {med.dosage} · {med.frequency}
                          </span>
                        </div>
                        <button
                          onClick={() => onFindMedicine(med.name)}
                          className="px-2 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <span>🏪</span>
                          <span>Find Kendra</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
