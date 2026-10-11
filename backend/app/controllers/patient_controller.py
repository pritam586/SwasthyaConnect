"""/api/v1/patients/me: the signed-in patient's own profile and records."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import require_patient
from app.models import User
from app.schemas.common import Message
from app.schemas.patient import (
    DashboardSummary,
    EncounterCreate,
    EncounterOut,
    MedicationCreate,
    MedicationOut,
    NotificationOut,
    PrescriptionOut,
    ProfileOut,
    ProfileUpdate,
)
from app.services import notification_service, patient_service

router = APIRouter(tags=["patients"])


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: User = Depends(require_patient), db: Session = Depends(get_db)) -> ProfileOut:
    return patient_service.get_profile(db, user)


@router.patch("/profile", response_model=ProfileOut)
def update_profile(req: ProfileUpdate, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> ProfileOut:
    return patient_service.update_profile(db, user, req)


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(user: User = Depends(require_patient), db: Session = Depends(get_db)) -> DashboardSummary:
    return patient_service.dashboard(db, user)


@router.get("/medications", response_model=list[MedicationOut])
def list_medications(user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return patient_service.list_medications(db, user)


@router.post("/medications", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
def add_medication(req: MedicationCreate, user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return patient_service.add_medication(db, user, req)


@router.delete("/medications/{medication_id}", response_model=Message)
def delete_medication(medication_id: str, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> Message:
    patient_service.delete_medication(db, user, medication_id)
    return Message(message="Medication removed.")


@router.get("/encounters", response_model=list[EncounterOut])
def list_encounters(user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return patient_service.list_encounters(db, user)


@router.post("/encounters", response_model=EncounterOut, status_code=status.HTTP_201_CREATED)
def add_encounter(req: EncounterCreate, user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return patient_service.add_encounter(db, user, req)


@router.get("/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return patient_service.list_prescriptions(db, user)


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return notification_service.list_for_user(db, user.id)


@router.post("/notifications/{notification_id}/read", response_model=Message)
def mark_notification_read(notification_id: str, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> Message:
    notification_service.mark_read(db, user.id, notification_id)
    return Message(message="Marked as read.")
