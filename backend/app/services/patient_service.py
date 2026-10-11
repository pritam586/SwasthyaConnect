"""Patient profile and patient-owned records. Every query is scoped to the signed-in patient."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants import AppointmentStatus, MedicationStatus
from app.models import (
    Appointment,
    HealthEncounter,
    MedicalReport,
    Medication,
    Notification,
    PatientProfile,
    Prescription,
    ScreeningResult,
    User,
    new_id,
)
from app.schemas.patient import DashboardSummary, EncounterCreate, MedicationCreate, ProfileOut, ProfileUpdate
from app.services import audit_service
from app.utils.clock import as_utc
from app.utils.errors import NotFoundError

_PROFILE_FIELDS = (
    "date_of_birth",
    "blood_group",
    "address",
    "emergency_contact",
    "allergies",
    "chronic_conditions",
    "medical_history",
)
_USER_FIELDS = ("name", "age", "gender", "location")


def _profile(db: Session, user: User) -> PatientProfile:
    if user.patient_profile is None:
        user.patient_profile = PatientProfile(id=new_id("prf"))
        db.flush()
    return user.patient_profile


def get_profile(db: Session, user: User) -> ProfileOut:
    profile = _profile(db, user)
    data = {field: getattr(user, field) for field in ("id", "name", "phone", "email", "age", "gender", "location", "abha_id")}
    data.update({field: getattr(profile, field) for field in _PROFILE_FIELDS})
    return ProfileOut(**data)


def update_profile(db: Session, user: User, changes: ProfileUpdate) -> ProfileOut:
    profile = _profile(db, user)
    for field, value in changes.model_dump(exclude_unset=True).items():
        if field in _USER_FIELDS and value is not None:
            setattr(user, field, value)
        elif field in _PROFILE_FIELDS:
            setattr(profile, field, value)
    audit_service.record(db, user.id, "PROFILE_UPDATE", "users", user.id)
    db.commit()
    return get_profile(db, user)


def dashboard(db: Session, user: User) -> DashboardSummary:
    def count(model, *conditions) -> int:
        return db.scalar(select(func.count()).select_from(model).where(model.patient_id == user.id, *conditions)) or 0

    upcoming = db.scalar(
        select(Appointment)
        .where(
            Appointment.patient_id == user.id,
            Appointment.status.in_([AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED]),
        )
        .order_by(Appointment.slot_date, Appointment.slot_time)
        .limit(1)
    )
    latest = db.scalar(
        select(ScreeningResult).where(ScreeningResult.patient_id == user.id).order_by(ScreeningResult.created_at.desc()).limit(1)
    )
    unread = db.scalar(
        select(func.count()).select_from(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False))
    )
    return DashboardSummary(
        active_medications=count(Medication, Medication.status == MedicationStatus.ACTIVE),
        encounters=count(HealthEncounter),
        reports=count(MedicalReport),
        prescriptions=count(Prescription),
        screenings=count(ScreeningResult),
        unread_notifications=unread or 0,
        upcoming_appointment=(
            {"id": upcoming.id, "doctor_name": upcoming.doctor.name, "slot_date": upcoming.slot_date.isoformat(),
             "slot_time": upcoming.slot_time, "status": upcoming.status}
            if upcoming else None
        ),
        latest_screening=(
            {"id": latest.id, "screening_label": latest.screening_label, "confidence": latest.confidence,
             "created_at": as_utc(latest.created_at).isoformat()}
            if latest else None
        ),
    )


def list_medications(db: Session, user: User) -> list[Medication]:
    return list(db.scalars(select(Medication).where(Medication.patient_id == user.id).order_by(Medication.created_at.desc())))


def add_medication(db: Session, user: User, req: MedicationCreate) -> Medication:
    medication = Medication(id=new_id("med"), patient_id=user.id, **req.model_dump())
    medication.generic_name = medication.generic_name or medication.medicine_name
    db.add(medication)
    db.commit()
    return medication


def delete_medication(db: Session, user: User, medication_id: str) -> None:
    medication = db.scalar(select(Medication).where(Medication.id == medication_id, Medication.patient_id == user.id))
    if medication is None:
        raise NotFoundError("Medication not found.")
    db.delete(medication)
    db.commit()


def list_encounters(db: Session, user: User) -> list[HealthEncounter]:
    query = select(HealthEncounter).where(HealthEncounter.patient_id == user.id).order_by(HealthEncounter.encounter_date.desc())
    return list(db.scalars(query))


def add_encounter(db: Session, user: User, req: EncounterCreate) -> HealthEncounter:
    encounter = HealthEncounter(id=new_id("enc"), patient_id=user.id, **req.model_dump())
    db.add(encounter)
    db.commit()
    return encounter


def list_prescriptions(db: Session, user: User) -> list[Prescription]:
    query = select(Prescription).where(Prescription.patient_id == user.id).order_by(Prescription.prescription_date.desc())
    return list(db.scalars(query))
