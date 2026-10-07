import { apiRequest } from "@/lib/api-client";
import type { MedicalReport, ReportUploadResult } from "@/types/reports";

export const reportService = {
  list() {
    return apiRequest<MedicalReport[]>("/api/v1/reports/my");
  },

  upload(file: File, reportTitle: string, reportType: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("report_title", reportTitle);
    form.append("report_type", reportType);
    return apiRequest<ReportUploadResult>("/api/v1/reports/upload", {
      method: "POST",
      formData: form,
    });
  },

  remove(id: string) {
    return apiRequest<{ success: boolean; message: string }>(`/api/v1/reports/${id}`, {
      method: "DELETE",
    });
  },
};
