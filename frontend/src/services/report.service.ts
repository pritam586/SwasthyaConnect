import { apiRequest } from "@/lib/api-client";
import type { Message } from "@/types/api";
import type { MedicalReport } from "@/types/clinical";

export const reportService = {
  list: () => apiRequest<MedicalReport[]>("/api/v1/reports"),
  upload: (file: File, reportTitle: string, reportType: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("report_title", reportTitle);
    form.append("report_type", reportType);
    return apiRequest<MedicalReport>("/api/v1/reports", { method: "POST", formData: form });
  },
  remove: (id: string) => apiRequest<Message>(`/api/v1/reports/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
