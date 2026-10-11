"""Pharmacy search with stock lookup, sorted by distance from the patient."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.constants import StockStatus
from app.models import Medicine, Pharmacy, PharmacyInventory
from app.schemas.pharmacy import MedicineStock, PharmacyResult, PharmacySearchRequest
from app.utils.geo import bounding_box, haversine_km

_IN_STOCK = {StockStatus.AVAILABLE, StockStatus.LOW_STOCK}


def _medicine_matches(db: Session, requested: str) -> set[str]:
    term = f"%{requested.strip().lower()}%"
    query = select(Medicine.id).where(
        Medicine.active.is_(True), or_(func.lower(Medicine.name).like(term), func.lower(Medicine.generic_name).like(term))
    )
    return set(db.scalars(query))


def _stock_for(pharmacy: Pharmacy, requested: str, medicine_ids: set[str]) -> MedicineStock:
    rows = [row for row in pharmacy.inventory if row.medicine_id in medicine_ids]
    in_stock = [row for row in rows if row.stock_status in _IN_STOCK and row.quantity > 0]
    best = in_stock[0] if in_stock else (rows[0] if rows else None)
    if best is None:
        # Not in this pharmacy's recorded stock: say so instead of guessing.
        return MedicineStock(requested=requested, status="UNKNOWN")
    return MedicineStock(
        requested=requested,
        medicine_id=best.medicine_id,
        medicine_name=best.medicine.name,
        status=best.stock_status if best in in_stock else StockStatus.OUT_OF_STOCK,
        quantity=best.quantity,
        price_inr=best.price_inr,
    )


def _overall(stocks: list[MedicineStock]) -> str:
    if not stocks or all(s.status == "UNKNOWN" for s in stocks):
        return "UNKNOWN"
    available = sum(1 for s in stocks if s.status in {"AVAILABLE", "LOW_STOCK"})
    if available == len(stocks):
        return "AVAILABLE"
    return "PARTIAL" if available else "OUT_OF_STOCK"


def search(db: Session, req: PharmacySearchRequest) -> list[PharmacyResult]:
    has_location = req.latitude is not None and req.longitude is not None
    query = select(Pharmacy).where(Pharmacy.active.is_(True)).options(
        selectinload(Pharmacy.inventory).selectinload(PharmacyInventory.medicine)
    )
    if req.jan_aushadhi_only:
        query = query.where(Pharmacy.is_jan_aushadhi.is_(True))
    if has_location:
        min_lat, max_lat, min_lon, max_lon = bounding_box(req.latitude, req.longitude, req.radius_km)
        query = query.where(Pharmacy.latitude.between(min_lat, max_lat), Pharmacy.longitude.between(min_lon, max_lon))

    requested = [m.strip() for m in req.medicines if m.strip()]
    matches = {name: _medicine_matches(db, name) for name in requested}

    results: list[PharmacyResult] = []
    for pharmacy in db.scalars(query):
        distance = None
        if has_location:
            distance = round(haversine_km(req.latitude, req.longitude, pharmacy.latitude, pharmacy.longitude), 2)
            if distance > req.radius_km:
                continue
        stocks = [_stock_for(pharmacy, name, matches[name]) for name in requested]
        results.append(
            PharmacyResult(
                id=pharmacy.id,
                name=pharmacy.name,
                address=pharmacy.address,
                latitude=pharmacy.latitude,
                longitude=pharmacy.longitude,
                phone=pharmacy.phone,
                is_jan_aushadhi=pharmacy.is_jan_aushadhi,
                open_hours=pharmacy.open_hours,
                distance_km=distance,
                availability=_overall(stocks),
                medicines=stocks,
                directions_url=f"https://www.google.com/maps/dir/?api=1&destination={pharmacy.latitude},{pharmacy.longitude}",
            )
        )
    if has_location:
        results.sort(key=lambda r: r.distance_km)
    else:
        results.sort(key=lambda r: r.name)
    return results


def search_medicines(db: Session, q: str, limit: int = 30) -> list[Medicine]:
    term = f"%{q.strip().lower()}%"
    query = (
        select(Medicine)
        .where(
            Medicine.active.is_(True),
            or_(func.lower(Medicine.name).like(term), func.lower(Medicine.generic_name).like(term),
                func.lower(Medicine.category).like(term)),
        )
        .order_by(Medicine.name)
        .limit(limit)
    )
    return list(db.scalars(query))


def all_medicines(db: Session) -> list[Medicine]:
    return list(db.scalars(select(Medicine).where(Medicine.active.is_(True)).order_by(Medicine.name)))
