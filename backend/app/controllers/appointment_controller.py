"""/api/v1/appointments: patient booking and doctor confirmation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import require_patient, require_verified_doctor
from app.models import Doctor, User
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentStatusUpdate, InstantConsultRequest
from app.services import appointment_service

router = APIRouter(tags=["appointments"])


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book(req: AppointmentCreate, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> AppointmentOut:
    return appointment_service.book(db, user, req)


@router.post("/instant", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def request_instant(req: InstantConsultRequest, user: User = Depends(require_patient),
                    db: Session = Depends(get_db)) -> AppointmentOut:
    return appointment_service.request_instant(db, user, req)


@router.get("/mine", response_model=list[AppointmentOut])
def my_appointments(user: User = Depends(require_patient), db: Session = Depends(get_db)) -> list[AppointmentOut]:
    return appointment_service.list_for_patient(db, user)


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(appointment_id: str, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> AppointmentOut:
    return appointment_service.cancel(db, user, appointment_id)


@router.get("/doctor", response_model=list[AppointmentOut])
def doctor_appointments(doctor: Doctor = Depends(require_verified_doctor), db: Session = Depends(get_db)) -> list[AppointmentOut]:
    return appointment_service.list_for_doctor(db, doctor)


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
def update_status(appointment_id: str, req: AppointmentStatusUpdate, doctor: Doctor = Depends(require_verified_doctor),
                  db: Session = Depends(get_db)) -> AppointmentOut:
    return appointment_service.update_status(db, doctor, appointment_id, req.status)
