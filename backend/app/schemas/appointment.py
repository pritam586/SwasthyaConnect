"""Appointment booking and status payloads."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel, OrmModel


class AppointmentCreate(ApiModel):
    doctor_id: str = Field(min_length=1, max_length=40)
    slot_date: date
    slot_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="HH:MM, 24-hour clinic time")
    notes: str | None = Field(default=None, max_length=1000)
    triage_case_id: str | None = Field(default=None, max_length=40)


class InstantConsultRequest(ApiModel):
    """Ask a doctor who is online right now for a consultation."""

    doctor_id: str = Field(min_length=1, max_length=40)
    notes: str | None = Field(default=None, max_length=1000)
    triage_case_id: str | None = Field(default=None, max_length=40)


class AppointmentStatusUpdate(ApiModel):
    status: Literal["CONFIRMED", "REJECTED", "COMPLETED"]


class AppointmentOut(OrmModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    slot_date: date
    slot_time: str
    appointment_type: str
    status: str
    notes: str | None
    triage_case_id: str | None
    created_at: datetime
