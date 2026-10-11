"""A patient's current and past medications."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.constants import MedicationStatus
from app.models.base import Base, TimestampMixin


class Medication(TimestampMixin, Base):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(150), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(150))
    dosage: Mapped[str | None] = mapped_column(String(100))
    frequency: Mapped[str | None] = mapped_column(String(100))
    route: Mapped[str] = mapped_column(String(30), default="Oral", nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    prescribed_by: Mapped[str | None] = mapped_column(String(100))
    prescription_id: Mapped[str | None] = mapped_column(ForeignKey("prescriptions.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(12), default=MedicationStatus.ACTIVE, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text)
