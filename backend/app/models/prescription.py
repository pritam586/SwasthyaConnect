"""Digital prescriptions issued by a verified doctor."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import JSON, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Prescription(TimestampMixin, Base):
    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctors.id", ondelete="SET NULL"), index=True)
    doctor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    triage_case_id: Mapped[str | None] = mapped_column(ForeignKey("triage_cases.id", ondelete="SET NULL"))
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"))
    diagnosis: Mapped[str | None] = mapped_column(Text)
    medicines: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    instructions: Mapped[str | None] = mapped_column(Text)
    prescription_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(12), default="ACTIVE", nullable=False)
