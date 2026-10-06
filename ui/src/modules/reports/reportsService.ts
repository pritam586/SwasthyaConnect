/**
 * Medical Reports & Appointment Service for SwasthyaConnect.
 * Communicates with backend endpoints:
 * - POST /api/v1/reports/upload
 * - GET /api/v1/reports/user/{userId}
 * - POST /api/v1/appointments/book
 * - GET /api/v1/appointments/patient/{patientId}
 */

export interface ExtractedMedicine {
  name: string
  dosage: string
  frequency: string
  duration: string
}

export interface MedicalReportRecord {
  id: string
  user_id: string
  patient_name: string
  report_title: string
  file_name: string
  file_path: string
  file_type: string
  extracted_medicines_json: string
  extracted_medicines?: ExtractedMedicine[]
  ai_summary: string
  created_at: string
}

export interface AppointmentRecord {
  id: string
  patient_id: string
  doctor_id: string
  patient_name: string
  doctor_name: string
  slot_date: string
  slot_time: string
  status: string
  notes: string
  created_at: string
}

export async function uploadMedicalReport(
  userId: string,
  patientName: string,
  reportTitle: string,
  file: File
): Promise<MedicalReportRecord> {
  const formData = new FormData()
  formData.append("user_id", userId)
  formData.append("patient_name", patientName)
  formData.append("report_title", reportTitle)
  formData.append("file", file)

  const res = await fetch("/api/v1/reports/upload", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }))
    throw new Error(err.detail || "Failed to upload medical report")
  }

  const data = await res.json()
  return {
    id: data.report_id,
    user_id: userId,
    patient_name: data.patient_name || patientName,
    report_title: data.report_title || reportTitle,
    file_name: data.file_name || file.name,
    file_path: "",
    file_type: file.type,
    extracted_medicines_json: JSON.stringify(data.extracted_medicines || []),
    extracted_medicines: data.extracted_medicines || [],
    ai_summary: data.ai_summary || "",
    created_at: new Date().toISOString(),
  }
}

export async function fetchUserReports(userId: string): Promise<MedicalReportRecord[]> {
  const res = await fetch(`/api/v1/reports/user/${encodeURIComponent(userId)}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch user reports: ${res.statusText}`)
  }
  const reports: any[] = await res.json()
  return reports.map((r) => {
    let meds: ExtractedMedicine[] = []
    if (Array.isArray(r.extracted_medicines)) {
      meds = r.extracted_medicines
    } else if (r.extracted_medicines_json) {
      try {
        meds = JSON.parse(r.extracted_medicines_json)
      } catch {
        meds = []
      }
    }
    return { ...r, extracted_medicines: meds }
  })
}

export async function bookAppointmentSlot(
  patientId: string,
  patientName: string,
  slotDate: string,
  slotTime: string,
  notes = "Anaemia consultation follow-up",
  doctorId = "doc-001",
  doctorName = "Dr. Anjali Verma"
): Promise<{ success: boolean; appointment_id: string; message: string }> {
  const res = await fetch("/api/v1/appointments/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patient_id: patientId,
      patient_name: patientName,
      doctor_id: doctorId,
      doctor_name: doctorName,
      slot_date: slotDate,
      slot_time: slotTime,
      notes,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Booking failed" }))
    throw new Error(err.detail || "Failed to book appointment")
  }

  return res.json()
}

export async function fetchPatientAppointments(patientId: string): Promise<AppointmentRecord[]> {
  const res = await fetch(`/api/v1/appointments/patient/${encodeURIComponent(patientId)}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch patient appointments: ${res.statusText}`)
  }
  return res.json()
}
