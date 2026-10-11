import { apiRequest } from "@/lib/api-client";
import type { Medicine, PharmacyResult, PharmacySearch } from "@/types/pharmacy";

export const pharmacyService = {
  search: (query: PharmacySearch) => apiRequest<PharmacyResult[]>("/api/v1/pharmacies/search", { method: "POST", body: query }),
  searchMedicines: (q: string) => apiRequest<Medicine[]>(`/api/v1/medicines/search?q=${encodeURIComponent(q)}`),
};
