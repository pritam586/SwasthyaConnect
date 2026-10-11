"""Load a real pharmacy dataset from CSV files (idempotent: re-running updates rows).

    python -m scripts.import_pharmacies --medicines medicines.csv --pharmacies pharmacies.csv --stock stock.csv

medicines.csv : name,generic_name,strength,form,category,mrp_inr,jan_aushadhi_price_inr
pharmacies.csv: name,address,latitude,longitude,phone,is_jan_aushadhi,open_hours
stock.csv     : pharmacy_name,medicine_name,stock_status,quantity,price_inr

Any file can be omitted. Rows are matched by name.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from sqlalchemy import select

from app.config.database import SessionLocal
from app.models import Medicine, Pharmacy, PharmacyInventory, new_id


def _rows(path: Path | None) -> list[dict[str, str]]:
    if path is None:
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return [{k.strip(): (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def _float(value: str) -> float | None:
    return float(value) if value else None


def _bool(value: str) -> bool:
    return value.lower() in {"1", "true", "yes", "y"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--medicines", type=Path)
    parser.add_argument("--pharmacies", type=Path)
    parser.add_argument("--stock", type=Path)
    args = parser.parse_args()

    with SessionLocal() as db:
        medicines = {m.name.lower(): m for m in db.scalars(select(Medicine))}
        for row in _rows(args.medicines):
            medicine = medicines.get(row["name"].lower()) or Medicine(id=new_id("mdc"), name=row["name"])
            medicine.generic_name = row["generic_name"]
            medicine.strength = row.get("strength") or None
            medicine.form = row.get("form") or "Tablet"
            medicine.category = row.get("category") or None
            medicine.mrp_inr = _float(row.get("mrp_inr", ""))
            medicine.jan_aushadhi_price_inr = _float(row.get("jan_aushadhi_price_inr", ""))
            medicines[medicine.name.lower()] = db.merge(medicine)

        pharmacies = {p.name.lower(): p for p in db.scalars(select(Pharmacy))}
        for row in _rows(args.pharmacies):
            pharmacy = pharmacies.get(row["name"].lower()) or Pharmacy(id=new_id("phm"), name=row["name"])
            pharmacy.address = row["address"]
            pharmacy.latitude = float(row["latitude"])
            pharmacy.longitude = float(row["longitude"])
            pharmacy.phone = row.get("phone") or None
            pharmacy.is_jan_aushadhi = _bool(row.get("is_jan_aushadhi", ""))
            pharmacy.open_hours = row.get("open_hours") or None
            pharmacies[pharmacy.name.lower()] = db.merge(pharmacy)
        db.flush()

        for row in _rows(args.stock):
            pharmacy = pharmacies.get(row["pharmacy_name"].lower())
            medicine = medicines.get(row["medicine_name"].lower())
            if pharmacy is None or medicine is None:
                print(f"Skipped stock row (unknown pharmacy or medicine): {row}")
                continue
            item = db.scalar(select(PharmacyInventory).where(
                PharmacyInventory.pharmacy_id == pharmacy.id, PharmacyInventory.medicine_id == medicine.id))
            if item is None:
                item = PharmacyInventory(id=new_id("inv"), pharmacy_id=pharmacy.id, medicine_id=medicine.id)
                db.add(item)
            item.stock_status = row.get("stock_status") or "AVAILABLE"
            item.quantity = int(row.get("quantity") or 0)
            item.price_inr = _float(row.get("price_inr", ""))
        db.commit()
    print("Import complete.")


if __name__ == "__main__":
    main()
