export type StockStatus = "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

export interface MedicineStock {
  requested: string;
  medicine_id: string | null;
  medicine_name: string | null;
  status: StockStatus;
  quantity: number | null;
  price_inr: number | null;
}

export interface PharmacyResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  is_jan_aushadhi: boolean;
  open_hours: string | null;
  distance_km: number | null;
  availability: "AVAILABLE" | "PARTIAL" | "OUT_OF_STOCK" | "UNKNOWN";
  medicines: MedicineStock[];
  directions_url: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name: string;
  strength: string | null;
  form: string;
  category: string | null;
  mrp_inr: number | null;
  jan_aushadhi_price_inr: number | null;
}

export interface PharmacySearch {
  latitude?: number;
  longitude?: number;
  medicines: string[];
  radius_km?: number;
  jan_aushadhi_only?: boolean;
}
