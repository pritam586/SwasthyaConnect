"""Doctor directory, weekly availability and "available now" status."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.constants import DoctorVerification
from app.models import Doctor, DoctorAvailability, new_id
from app.schemas.doctor import AvailabilitySlot, DoctorOut, DoctorSelfOut
from app.utils.clock import as_utc, clinic_now, utcnow
from app.utils.errors import NotFoundError

# A doctor who marked themselves online but has not used the app for this long is shown offline.
ONLINE_STALE_AFTER = timedelta(minutes=15)


def is_available_now(doctor: Doctor, now: datetime | None = None) -> bool:
    if doctor.is_online and doctor.last_seen_at and utcnow() - as_utc(doctor.last_seen_at) <= ONLINE_STALE_AFTER:
        return True
    local = now or clinic_now()
    current = local.time().replace(tzinfo=None)
    return any(
        slot.day_of_week == local.weekday() and slot.start_time <= current < slot.end_time
        for slot in doctor.availability
    )


def to_out(doctor: Doctor) -> DoctorOut:
    out = DoctorOut.model_validate(doctor)
    out.available_now = is_available_now(doctor)
    return out


def list_verified(db: Session, available_now: bool = False) -> list[DoctorOut]:
    doctors = db.scalars(
        select(Doctor)
        .where(Doctor.verification_status == DoctorVerification.VERIFIED)
        .options(selectinload(Doctor.availability))
        .order_by(Doctor.name)
    )
    results = [to_out(doctor) for doctor in doctors]
    if available_now:
        results = [doctor for doctor in results if doctor.available_now]
    # Doctors available right now first, so patients can connect immediately.
    return sorted(results, key=lambda d: not d.available_now)


def get_verified(db: Session, doctor_id: str) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None or doctor.verification_status != DoctorVerification.VERIFIED:
        raise NotFoundError("Doctor not found.")
    return doctor


def self_out(doctor: Doctor) -> DoctorSelfOut:
    out = DoctorSelfOut.model_validate(doctor)
    out.available_now = is_available_now(doctor)
    return out


def set_availability(db: Session, doctor: Doctor, slots: list[AvailabilitySlot]) -> DoctorSelfOut:
    doctor.availability.clear()
    db.flush()
    seen = set()
    for slot in slots:
        key = (slot.day_of_week, slot.start_time)
        if key in seen:
            continue
        seen.add(key)
        doctor.availability.append(
            DoctorAvailability(id=new_id("avl"), day_of_week=slot.day_of_week, start_time=slot.start_time, end_time=slot.end_time)
        )
    db.commit()
    return self_out(doctor)


def set_online(db: Session, doctor: Doctor, is_online: bool) -> DoctorSelfOut:
    doctor.is_online = is_online
    doctor.last_seen_at = utcnow()
    db.commit()
    return self_out(doctor)


def touch(db: Session, doctor: Doctor) -> None:
    """Called when the doctor uses the workstation, keeping an online status fresh."""
    if doctor.is_online:
        doctor.last_seen_at = utcnow()
        db.commit()
