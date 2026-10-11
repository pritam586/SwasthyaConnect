"""Doctor directory, availability and live status payloads."""

from __future__ import annotations

from datetime import time

from pydantic import Field, model_validator

from app.schemas.common import ApiModel, OrmModel


class AvailabilitySlot(OrmModel):
    day_of_week: int = Field(ge=0, le=6, description="0 = Monday")
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def _ordered(self) -> AvailabilitySlot:
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AvailabilityUpdate(ApiModel):
    slots: list[AvailabilitySlot] = Field(max_length=50)


class OnlineStatusUpdate(ApiModel):
    is_online: bool


class DoctorOut(OrmModel):
    id: str
    name: str
    specialization: str
    qualification: str
    experience_years: int
    clinic_name: str | None
    location: str | None
    consultation_fee: float
    is_online: bool
    available_now: bool = False
    availability: list[AvailabilitySlot] = []


class DoctorSelfOut(DoctorOut):
    license_number: str
    verification_status: str
