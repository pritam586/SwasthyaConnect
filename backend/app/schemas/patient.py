"""Patient profile and patient-owned record payloads."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field

from app.schemas.auth import Gender
from app.schemas.common import ApiModel, OrmModel

BloodGroup = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class ProfileOut(ApiModel):
    id: str
    name: str
    phone: str
    email: str | None
    age: int | None
    gender: str | None
    location: str | None
    abha_id: str | None
    date_of_birth: date | None = None
    blood_group: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None
    medical_history: str | None = None


class ProfileUpdate(ApiModel):
    """Patients edit their own demographics. ABHA and PM-JAY status come from their own flows."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    age: int | None = Field(default=None, ge=1, le=120)
    gender: Gender | None = None
    location: str | None = Field(default=None, min_length=2, max_length=200)
    date_of_birth: date | None = None
    blood_group: BloodGroup | None = None
    address: str | None = Field(default=None, max_length=300)
    emergency_contact: str | None = Field(default=None, max_length=100)
    allergies: str | None = Field(default=None, max_length=2000)
    chronic_conditions: str | None = Field(default=None, max_length=2000)
    medical_history: str | None = Field(default=None, max_length=5000)


class MedicationCreate(ApiModel):
    medicine_name: str = Field(min_length=2, max_length=150)
    generic_name: str | None = Field(default=None, max_length=150)
    dosage: str | None = Field(default=None, max_length=100)
    frequency: str | None = Field(default=None, max_length=100)
    route: str = Field(default="Oral", max_length=30)
    start_date: date | None = None
    end_date: date | None = None
    instructions: str | None = Field(default=None, max_length=1000)


class MedicationOut(OrmModel):
    id: str
    medicine_name: str
    generic_name: str | None
    dosage: str | None
    frequency: str | None
    route: str
    start_date: date | None
    end_date: date | None
    prescribed_by: str | None
    prescription_id: str | None
    status: str
    instructions: str | None
    created_at: datetime


class EncounterCreate(ApiModel):
    encounter_date: date
    reason: str = Field(min_length=3, max_length=300)
    doctor_name: str | None = Field(default=None, max_length=100)
    symptoms: str | None = Field(default=None, max_length=2000)
    diagnosis_notes: str | None = Field(default=None, max_length=2000)
    treatment_notes: str | None = Field(default=None, max_length=2000)


class EncounterOut(OrmModel):
    id: str
    encounter_date: date
    reason: str
    doctor_name: str | None
    symptoms: str | None
    diagnosis_notes: str | None
    treatment_notes: str | None
    prescription_id: str | None
    created_at: datetime


class PrescriptionOut(OrmModel):
    id: str
    doctor_name: str
    prescription_date: date
    diagnosis: str | None
    instructions: str | None
    status: str
    medicines: list[dict[str, Any]]
    created_at: datetime


class NotificationOut(OrmModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime


class DashboardSummary(ApiModel):
    active_medications: int
    encounters: int
    reports: int
    prescriptions: int
    screenings: int
    unread_notifications: int
    upcoming_appointment: dict[str, Any] | None
    latest_screening: dict[str, Any] | None
