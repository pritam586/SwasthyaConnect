export type StockStatus = "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

export interface MedicineCatalogueItem {
  id: string;
  name: string;
  generic_name: string;
  strength: string;
  form: string;
  category: string;
  mrp_inr: number;
  jan_aushadhi_price_inr: number;
  manufacturer: string | null;
  description: string | null;
  active: number | boolean;
}

export interface MedicineAvailability {
  medicine_id: string | null;
  medicine_name: string;
  status: StockStatus;
  quantity: number;
  price: number | null;
  is_jan_aushadhi: boolean;
  generic_substitute: string | null;
  jan_aushadhi_price_inr: number | null;
  note: string;
}

export interface PharmacyNearby {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  is_jan_aushadhi: boolean;
  open_hours: string;
  rating: number;
  distance_km: number;
  availability_status: "AVAILABLE" | "OUT_OF_STOCK" | "UNKNOWN";
  matched_medicines: MedicineAvailability[];
  directions_url: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PrescriptionPharmacySearch {
  latitude: number;
  longitude: number;
  medicines: string[];
  radius_km?: number;
}
