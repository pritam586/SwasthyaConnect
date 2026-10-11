"""Pharmacies, the medicine catalogue, and per-pharmacy stock."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import StockStatus
from app.models.base import Base, TimestampMixin


class Pharmacy(TimestampMixin, Base):
    __tablename__ = "pharmacies"
    __table_args__ = (Index("ix_pharmacies_coordinates", "latitude", "longitude"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    is_jan_aushadhi: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    open_hours: Mapped[str | None] = mapped_column(String(60))
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    inventory: Mapped[list[PharmacyInventory]] = relationship(back_populates="pharmacy", cascade="all, delete-orphan")


class Medicine(TimestampMixin, Base):
    __tablename__ = "medicines"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    generic_name: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    strength: Mapped[str | None] = mapped_column(String(60))
    form: Mapped[str] = mapped_column(String(40), default="Tablet", nullable=False)
    category: Mapped[str | None] = mapped_column(String(80))
    mrp_inr: Mapped[float | None] = mapped_column(Float)
    jan_aushadhi_price_inr: Mapped[float | None] = mapped_column(Float)
    manufacturer: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PharmacyInventory(Base):
    __tablename__ = "pharmacy_inventory"
    __table_args__ = (UniqueConstraint("pharmacy_id", "medicine_id", name="uq_inventory_pharmacy_medicine"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    pharmacy_id: Mapped[str] = mapped_column(ForeignKey("pharmacies.id", ondelete="CASCADE"), index=True, nullable=False)
    medicine_id: Mapped[str] = mapped_column(ForeignKey("medicines.id", ondelete="CASCADE"), index=True, nullable=False)
    stock_status: Mapped[str] = mapped_column(String(12), default=StockStatus.AVAILABLE, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price_inr: Mapped[float | None] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    pharmacy: Mapped[Pharmacy] = relationship(back_populates="inventory")
    medicine: Mapped[Medicine] = relationship()
