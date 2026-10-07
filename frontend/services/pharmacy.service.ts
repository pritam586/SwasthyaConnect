import { apiRequest } from "@/lib/api-client";
import type {
  Coordinates,
  MedicineCatalogueItem,
  PharmacyNearby,
  PrescriptionPharmacySearch,
} from "@/types/pharmacy";

function nearbyQuery(coords: Coordinates, extra: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
  });
  Object.entries(extra).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export const pharmacyService = {
  nearby(coords: Coordinates, options?: { medicine?: string; janAushadhiOnly?: boolean; radiusKm?: number }) {
    return apiRequest<PharmacyNearby[]>(
      `/api/v1/pharmacies/nearby?${nearbyQuery(coords, {
        medicine: options?.medicine,
        jan_aushadhi_only: options?.janAushadhiOnly ? "true" : undefined,
        radius_km: options?.radiusKm ? String(options.radiusKm) : undefined,
      })}`,
      { auth: false },
    );
  },

  searchPrescription(payload: PrescriptionPharmacySearch) {
    return apiRequest<PharmacyNearby[]>("/api/v1/pharmacies/search-prescription", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  searchMedicines(q: string) {
    return apiRequest<MedicineCatalogueItem[]>(`/api/v1/medicines/search?q=${encodeURIComponent(q)}`, {
      auth: false,
    });
  },

  catalogue() {
    return apiRequest<MedicineCatalogueItem[]>("/api/v1/medicines", { auth: false });
  },
};
