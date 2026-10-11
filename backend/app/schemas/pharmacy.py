"""Pharmacy search and medicine catalogue payloads."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel, OrmModel

Availability = Literal["AVAILABLE", "PARTIAL", "OUT_OF_STOCK", "UNKNOWN"]


class MedicineOut(OrmModel):
    id: str
    name: str
    generic_name: str
    strength: str | None
    form: str
    category: str | None
    mrp_inr: float | None
    jan_aushadhi_price_inr: float | None


class MedicineStock(ApiModel):
    requested: str
    medicine_id: str | None = None
    medicine_name: str | None = None
    status: Literal["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"]
    quantity: int | None = None
    price_inr: float | None = None


class PharmacyResult(ApiModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    phone: str | None
    is_jan_aushadhi: bool
    open_hours: str | None
    distance_km: float | None
    availability: Availability
    medicines: list[MedicineStock]
    directions_url: str


class PharmacySearchRequest(ApiModel):
    """Location is optional: without it results are not distance-sorted (permission denied)."""

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    medicines: list[str] = Field(default_factory=list, max_length=20)
    radius_km: float = Field(default=50.0, gt=0, le=500)
    jan_aushadhi_only: bool = False
