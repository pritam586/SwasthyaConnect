/**
 * Pharmacy & Medicine Locator Service for SwasthyaConnect.
 * Communicates with backend endpoints:
 * - GET /api/v1/pharmacies/nearby
 * - POST /api/v1/pharmacies/find-all-medicines
 * - GET /api/v1/medicines/search
 */

export interface MedicineAvailability {
  medicine_name: string
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN"
  quantity: number
  is_jan_aushadhi: boolean
  generic_substitute?: string | null
  jan_aushadhi_price_inr?: number | null
  note: string
}

export interface PharmacyNearbyResult {
  id: string
  name: string
  address: string
  latitude: float
  longitude: float
  phone: string | null
  is_jan_aushadhi: boolean
  open_hours: string
  rating: number
  distance_km: number
  availability_status: "AVAILABLE" | "OUT_OF_STOCK" | "UNKNOWN"
  matched_medicines: MedicineAvailability[]
  directions_url: string
}

type float = number

export interface MultiMedicineSearchRequest {
  latitude: number
  longitude: number
  medicines: string[]
  radius_km?: number
}

export async function fetchNearbyPharmacies(
  latitude: number,
  longitude: number,
  medicine?: string,
  radiusKm = 30.0
): Promise<PharmacyNearbyResult[]> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius_km: radiusKm.toString(),
  })
  if (medicine && medicine.trim()) {
    params.append("medicine", medicine.trim())
  }

  const res = await fetch(`/api/v1/pharmacies/nearby?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch nearby pharmacies: ${res.statusText}`)
  }
  return res.json()
}

export async function findAllPrescriptionMedicines(
  latitude: number,
  longitude: number,
  medicines: string[],
  radiusKm = 30.0
): Promise<PharmacyNearbyResult[]> {
  const res = await fetch(`/api/v1/pharmacies/find-all-medicines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude,
      longitude,
      medicines,
      radius_km: radiusKm,
    }),
  })
  if (!res.ok) {
    throw new Error(`Failed to find pharmacies for all medicines: ${res.statusText}`)
  }
  return res.json()
}

export async function searchMedicinesCatalogue(query: string): Promise<any[]> {
  const res = await fetch(`/api/v1/medicines/search?query=${encodeURIComponent(query)}`)
  if (!res.ok) {
    throw new Error(`Failed to search medicines: ${res.statusText}`)
  }
  return res.json()
}
