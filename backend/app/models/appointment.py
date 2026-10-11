"""Appointments between a patient and a doctor."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import AppointmentStatus, AppointmentType
from app.models.base import Base, TimestampMixin


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"
    __table_args__ = (Index("ix_appointments_doctor_slot", "doctor_id", "slot_date", "slot_time"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    slot_date: Mapped[date] = mapped_column(Date, nullable=False)
    slot_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "HH:MM", 24-hour clinic time
    appointment_type: Mapped[str] = mapped_column(String(10), default=AppointmentType.SCHEDULED, nullable=False)
    status: Mapped[str] = mapped_column(String(10), index=True, default=AppointmentStatus.REQUESTED, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    triage_case_id: Mapped[str | None] = mapped_column(ForeignKey("triage_cases.id", ondelete="SET NULL"))

    patient: Mapped["User"] = relationship()  # noqa: F821
    doctor: Mapped["Doctor"] = relationship()  # noqa: F821
