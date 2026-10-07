export type ReportProcessingStatus = "UPLOADING" | "PROCESSING" | "PROCESSED" | "FAILED" | string;

export interface ExtractedMedicine {
  medicine_id?: string;
  name: string;
  generic_name?: string;
  strength?: string;
  form?: string;
  category?: string;
  dosage?: string;
  frequency?: string;
}

export interface MedicalReport {
  id: string;
  patient_id: string;
  patient_name: string | null;
  report_title: string;
  report_type: string;
  file_name: string;
  file_url: string | null;
  file_type: string;
  extracted_medicines: ExtractedMedicine[];
  ai_summary: string | null;
  processing_status?: ReportProcessingStatus;
  created_at: string;
}

export interface ReportUploadResult {
  success: boolean;
  report_id: string;
  report_title: string;
  file_name: string | null;
  extracted_medicines: ExtractedMedicine[];
  ai_summary: string;
  message: string;
}
