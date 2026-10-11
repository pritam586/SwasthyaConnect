import { apiRequest } from "@/lib/api-client";
import type { Screening } from "@/types/clinical";

export const screeningService = {
  analyze: (image: File) => {
    const form = new FormData();
    form.append("image", image);
    return apiRequest<Screening>("/api/v1/screenings", { method: "POST", formData: form });
  },
  history: () => apiRequest<Screening[]>("/api/v1/screenings"),
};
