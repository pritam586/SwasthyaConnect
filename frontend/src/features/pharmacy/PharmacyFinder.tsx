"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type GeoState, useGeolocation } from "@/hooks/use-geolocation";
import { formatDistanceKm } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { pharmacyService } from "@/services/pharmacy.service";
import type { PharmacyResult } from "@/types/pharmacy";

export function PharmacyFinder({ initialMedicines }: { initialMedicines: string[] }) {
  const { t } = useI18n();
  const { state: geo, locate } = useGeolocation();
  const [medicines, setMedicines] = useState(initialMedicines.join(", "));
  const [results, setResults] = useState<PharmacyResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(useLocation: boolean) {
    setBusy(true);
    setError(null);
    let position: GeoState = geo;
    if (useLocation && geo.status !== "ready") position = await locate();
    try {
      const names = medicines.split(",").map((m) => m.trim()).filter(Boolean);
      setResults(
        await pharmacyService.search({
          medicines: names,
          ...(position.status === "ready" ? { latitude: position.latitude, longitude: position.longitude, radius_km: 50 } : {}),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  const availabilityText = {
    AVAILABLE: t("inStock"),
    PARTIAL: t("partialStock"),
    OUT_OF_STOCK: t("outOfStock"),
    UNKNOWN: t("stockUnknown"),
  };

  return (
    <div className="space-y-4">
      <Card>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void search(true); }}>
          <TextField label={t("medicinesToFind")} name="medicines" placeholder="e.g. Ferrous Sulfate, Folic Acid"
                     value={medicines} onChange={(e) => setMedicines(e.target.value)} hint="Separate names with commas." />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy}>{t("useMyLocation")}</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void search(false)}>{t("search")}</Button>
          </div>
        </form>
        {geo.status === "denied" ? <p className="mt-3 text-sm text-amber-900" role="status">{t("locationDenied")}</p> : null}
        {geo.status === "unavailable" ? <p className="mt-3 text-sm text-amber-900" role="status">{t("locationUnavailable")}</p> : null}
      </Card>

      {busy ? <Spinner label={t("loading")} /> : null}
      {error ? <p className="text-red-700" role="alert">{error}</p> : null}
      {results && results.length === 0 ? (
        <EmptyState title="No pharmacies found." description="Try without a medicine name, or search a wider area." />
      ) : null}
      <ul className="space-y-3">
        {(results ?? []).map((pharmacy) => (
          <li key={pharmacy.id}>
            <Card>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold">{pharmacy.name}</h3>
                  <p className="text-sm text-muted">{pharmacy.address}</p>
                  <p className="text-sm text-muted">
                    {[
                      pharmacy.distance_km !== null ? `${formatDistanceKm(pharmacy.distance_km)} ${t("awayKm")}` : null,
                      pharmacy.open_hours,
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {pharmacy.is_jan_aushadhi ? <p className="text-sm font-semibold text-teal-dark">{t("janAushadhi")}</p> : null}
                </div>
                {pharmacy.medicines.length ? (
                  <StatusBadge value={pharmacy.availability === "PARTIAL" ? "LOW_STOCK" : pharmacy.availability} label={availabilityText[pharmacy.availability]} />
                ) : null}
              </div>
              {pharmacy.medicines.length ? (
                <ul className="mt-2 text-sm">
                  {pharmacy.medicines.map((stock) => (
                    <li key={stock.requested}>
                      {stock.medicine_name ?? stock.requested}: {stock.status.replaceAll("_", " ").toLowerCase()}
                      {stock.price_inr ? ` · ₹${stock.price_inr}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3">
                <a href={pharmacy.directions_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-teal">
                  {t("directions")} →
                </a>
                {pharmacy.phone ? (
                  <a href={`tel:${pharmacy.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center font-semibold text-teal">
                    Call {pharmacy.phone}
                  </a>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
