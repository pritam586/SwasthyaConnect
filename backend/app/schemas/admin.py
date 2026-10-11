"""Administrator payloads: doctor verification and the pharmacy dataset."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel


class DoctorVerificationUpdate(ApiModel):
    status: Literal["VERIFIED", "REJECTED", "PENDING"]


class UserStatusUpdate(ApiModel):
    is_active: bool


class PharmacyCreate(ApiModel):
    name: str = Field(min_length=2, max_length=150)
    address: str = Field(min_length=5, max_length=300)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    phone: str | None = Field(default=None, max_length=30)
    is_jan_aushadhi: bool = False
    open_hours: str | None = Field(default=None, max_length=60)


class MedicineCreate(ApiModel):
    name: str = Field(min_length=2, max_length=150)
    generic_name: str = Field(min_length=2, max_length=150)
    strength: str | None = Field(default=None, max_length=60)
    form: str = Field(default="Tablet", max_length=40)
    category: str | None = Field(default=None, max_length=80)
    mrp_inr: float | None = Field(default=None, ge=0)
    jan_aushadhi_price_inr: float | None = Field(default=None, ge=0)
    manufacturer: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=1000)


class InventoryUpsert(ApiModel):
    pharmacy_id: str = Field(max_length=40)
    medicine_id: str = Field(max_length=40)
    stock_status: Literal["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK"]
    quantity: int = Field(ge=0)
    price_inr: float | None = Field(default=None, ge=0)
