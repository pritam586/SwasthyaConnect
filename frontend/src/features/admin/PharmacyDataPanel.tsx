"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { useAsync } from "@/hooks/use-async";
import { adminService } from "@/services/admin.service";

const EMPTY_PHARMACY = { name: "", address: "", latitude: "", longitude: "", phone: "", open_hours: "", is_jan_aushadhi: false };
const EMPTY_MEDICINE = { name: "", generic_name: "", strength: "", form: "Tablet", category: "" };

/** Maintains the real pharmacy dataset: pharmacies, the medicine catalogue, and stock levels. */
export function PharmacyDataPanel() {
  const pharmacies = useAsync(() => adminService.pharmacies(), []);
  const medicines = useAsync(() => adminService.medicines(), []);
  const [pharmacy, setPharmacy] = useState(EMPTY_PHARMACY);
  const [medicine, setMedicine] = useState(EMPTY_MEDICINE);
  const [stock, setStock] = useState({ pharmacy_id: "", medicine_id: "", stock_status: "AVAILABLE", quantity: "0", price_inr: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, success: string) {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">Pharmacy dataset</h2>
      <p className="text-sm text-muted">
        {pharmacies.data?.length ?? 0} pharmacies · {medicines.data?.length ?? 0} medicines. Bulk import: scripts/import_pharmacies.py.
      </p>

      <form className="mt-4 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const created = await adminService.createPharmacy({
            ...pharmacy, latitude: Number(pharmacy.latitude), longitude: Number(pharmacy.longitude),
            phone: pharmacy.phone || null, open_hours: pharmacy.open_hours || null,
          });
          pharmacies.setData([...(pharmacies.data ?? []), created]);
          setPharmacy(EMPTY_PHARMACY);
        }, "Pharmacy added.");
      }}>
        <h3 className="font-semibold">Add a pharmacy</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Name" name="ph-name" required value={pharmacy.name} onChange={(e) => setPharmacy({ ...pharmacy, name: e.target.value })} />
          <TextField label="Address" name="ph-address" required value={pharmacy.address} onChange={(e) => setPharmacy({ ...pharmacy, address: e.target.value })} />
          <TextField label="Latitude" name="ph-lat" type="number" step="any" required value={pharmacy.latitude} onChange={(e) => setPharmacy({ ...pharmacy, latitude: e.target.value })} />
          <TextField label="Longitude" name="ph-lon" type="number" step="any" required value={pharmacy.longitude} onChange={(e) => setPharmacy({ ...pharmacy, longitude: e.target.value })} />
          <TextField label="Phone" name="ph-phone" value={pharmacy.phone} onChange={(e) => setPharmacy({ ...pharmacy, phone: e.target.value })} />
          <TextField label="Opening hours" name="ph-hours" value={pharmacy.open_hours} onChange={(e) => setPharmacy({ ...pharmacy, open_hours: e.target.value })} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pharmacy.is_jan_aushadhi} onChange={(e) => setPharmacy({ ...pharmacy, is_jan_aushadhi: e.target.checked })} />
          Jan Aushadhi Kendra
        </label>
        <Button type="submit">Add pharmacy</Button>
      </form>

      <form className="mt-6 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const created = await adminService.createMedicine({
            ...medicine, strength: medicine.strength || null, category: medicine.category || null,
            mrp_inr: null, jan_aushadhi_price_inr: null,
          });
          medicines.setData([...(medicines.data ?? []), created]);
          setMedicine(EMPTY_MEDICINE);
        }, "Medicine added.");
      }}>
        <h3 className="font-semibold">Add a medicine</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Brand / product name" name="md-name" required value={medicine.name} onChange={(e) => setMedicine({ ...medicine, name: e.target.value })} />
          <TextField label="Generic name" name="md-generic" required value={medicine.generic_name} onChange={(e) => setMedicine({ ...medicine, generic_name: e.target.value })} />
          <TextField label="Strength" name="md-strength" value={medicine.strength} onChange={(e) => setMedicine({ ...medicine, strength: e.target.value })} />
          <TextField label="Category" name="md-category" value={medicine.category} onChange={(e) => setMedicine({ ...medicine, category: e.target.value })} />
        </div>
        <Button type="submit">Add medicine</Button>
      </form>

      <form className="mt-6 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await adminService.upsertInventory({
            ...stock, quantity: Number(stock.quantity), price_inr: stock.price_inr ? Number(stock.price_inr) : null,
          });
        }, "Stock updated.");
      }}>
        <h3 className="font-semibold">Update stock</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Pharmacy" name="st-pharmacy" required value={stock.pharmacy_id} onChange={(e) => setStock({ ...stock, pharmacy_id: e.target.value })}>
            <option value="">Choose...</option>
            {(pharmacies.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
          <SelectField label="Medicine" name="st-medicine" required value={stock.medicine_id} onChange={(e) => setStock({ ...stock, medicine_id: e.target.value })}>
            <option value="">Choose...</option>
            {(medicines.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </SelectField>
          <SelectField label="Status" name="st-status" value={stock.stock_status} onChange={(e) => setStock({ ...stock, stock_status: e.target.value })}>
            <option value="AVAILABLE">Available</option>
            <option value="LOW_STOCK">Low stock</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </SelectField>
          <TextField label="Quantity" name="st-qty" type="number" min={0} value={stock.quantity} onChange={(e) => setStock({ ...stock, quantity: e.target.value })} />
          <TextField label="Price (₹, optional)" name="st-price" type="number" min={0} step="any" value={stock.price_inr} onChange={(e) => setStock({ ...stock, price_inr: e.target.value })} />
        </div>
        <Button type="submit">Save stock</Button>
      </form>
      {message ? <p className="mt-3 text-green-800" role="status">{message}</p> : null}
      {error ? <p className="mt-3 text-red-700" role="alert">{error}</p> : null}
    </Card>
  );
}
