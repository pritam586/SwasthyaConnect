"""/api/v1/doctors: public directory of verified doctors, and a doctor's own settings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import get_current_user, require_doctor_account, require_verified_doctor
from app.models import Doctor, User
from app.schemas.doctor import AvailabilityUpdate, DoctorOut, DoctorSelfOut, OnlineStatusUpdate
from app.schemas.patient import NotificationOut
from app.services import doctor_service, notification_service

router = APIRouter(tags=["doctors"])


@router.get("", response_model=list[DoctorOut])
def list_doctors(
    available_now: bool = Query(default=False),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DoctorOut]:
    return doctor_service.list_verified(db, available_now)


@router.get("/me", response_model=DoctorSelfOut)
def my_profile(doctor: Doctor = Depends(require_doctor_account)) -> DoctorSelfOut:
    return doctor_service.self_out(doctor)


@router.put("/me/availability", response_model=DoctorSelfOut)
def set_availability(req: AvailabilityUpdate, doctor: Doctor = Depends(require_verified_doctor),
                     db: Session = Depends(get_db)) -> DoctorSelfOut:
    return doctor_service.set_availability(db, doctor, req.slots)


@router.patch("/me/status", response_model=DoctorSelfOut)
def set_status(req: OnlineStatusUpdate, doctor: Doctor = Depends(require_verified_doctor),
               db: Session = Depends(get_db)) -> DoctorSelfOut:
    return doctor_service.set_online(db, doctor, req.is_online)


@router.get("/me/notifications", response_model=list[NotificationOut])
def my_notifications(doctor: Doctor = Depends(require_doctor_account), db: Session = Depends(get_db)):
    return notification_service.list_for_user(db, doctor.user_id)


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: str, _user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> DoctorOut:
    return doctor_service.to_out(doctor_service.get_verified(db, doctor_id))
