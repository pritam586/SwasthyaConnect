import { Card } from "@/components/common/Card";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { formatDistanceKm } from "@/lib/format";
import type { PharmacyNearby } from "@/types/pharmacy";

export function PharmacyCard({ pharmacy }: { pharmacy: PharmacyNearby }) {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">{pharmacy.name}</h2>
          <p className="mt-1 text-base text-muted">{pharmacy.address}</p>
          <p className="mt-2 text-sm font-semibold text-teal-dark">
            {formatDistanceKm(pharmacy.distance_km)} away · {pharmacy.open_hours}
          </p>
          {pharmacy.is_jan_aushadhi ? (
            <p className="mt-1 text-sm font-medium text-ink">Jan Aushadhi kendra</p>
          ) : null}
        </div>
        <StatusBadge
          value={pharmacy.availability_status}
          label={
            pharmacy.availability_status === "UNKNOWN"
              ? "Stock not verified"
              : pharmacy.availability_status.replaceAll("_", " ")
          }
        />
      </div>
      {pharmacy.matched_medicines.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {pharmacy.matched_medicines.map((med) => (
            <li key={`${pharmacy.id}-${med.medicine_name}`} className="rounded-xl bg-teal-soft/60 px-3 py-2 text-sm">
              <span className="font-semibold">{med.medicine_name}</span>
              {" · "}
              {med.status.replaceAll("_", " ")}
              {med.price != null ? ` · ₹${med.price}` : ""}
              <span className="block text-muted">{med.note}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {pharmacy.phone ? (
          <a className="inline-flex min-h-12 items-center rounded-xl bg-teal px-4 font-semibold text-white" href={`tel:${pharmacy.phone}`}>
            Call
          </a>
        ) : null}
        <a
          className="inline-flex min-h-12 items-center rounded-xl border border-line px-4 font-semibold"
          href={pharmacy.directions_url}
          target="_blank"
          rel="noreferrer"
        >
          Directions
        </a>
      </div>
    </Card>
  );
}
