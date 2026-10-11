"""Booking, instant consultation requests, and doctor-side status changes."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import AppointmentStatus, AppointmentType
from app.models import Appointment, Doctor, TriageCase, User, new_id
from app.schemas.appointment import AppointmentCreate, AppointmentOut, InstantConsultRequest
from app.services import audit_service, doctor_service, notification_service
from app.utils.clock import clinic_now
from app.utils.errors import AppError, ConflictError, NotFoundError

_OPEN = (AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED)


def to_out(appointment: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=appointment.id,
        patient_id=appointment.patient_id,
        patient_name=appointment.patient.name,
        doctor_id=appointment.doctor_id,
        doctor_name=appointment.doctor.name,
        slot_date=appointment.slot_date,
        slot_time=appointment.slot_time,
        appointment_type=appointment.appointment_type,
        status=appointment.status,
        notes=appointment.notes,
        triage_case_id=appointment.triage_case_id,
        created_at=appointment.created_at,
    )


def _own_case_id(db: Session, patient: User, case_id: str | None) -> str | None:
    if case_id is None:
        return None
    case = db.get(TriageCase, case_id)
    if case is None or case.patient_id != patient.id:
        raise NotFoundError("Triage case not found.")
    return case.id


def book(db: Session, patient: User, req: AppointmentCreate) -> AppointmentOut:
    doctor = doctor_service.get_verified(db, req.doctor_id)
    now = clinic_now()
    if (req.slot_date, req.slot_time) < (now.date(), now.strftime("%H:%M")):
        raise AppError("Choose a date and time in the future.")
    if req.slot_date > now.date() + timedelta(days=90):
        raise AppError("Appointments can be booked up to 90 days ahead.")
    clash = db.scalar(
        select(Appointment.id).where(
            Appointment.doctor_id == doctor.id,
            Appointment.slot_date == req.slot_date,
            Appointment.slot_time == req.slot_time,
            Appointment.status.in_(_OPEN),
        )
    )
    if clash:
        raise ConflictError("This time slot is already booked. Please pick another time.")
    return _create(db, patient, doctor, req.slot_date, req.slot_time, AppointmentType.SCHEDULED, req.notes,
                   _own_case_id(db, patient, req.triage_case_id))


def request_instant(db: Session, patient: User, req: InstantConsultRequest) -> AppointmentOut:
    doctor = doctor_service.get_verified(db, req.doctor_id)
    if not doctor_service.is_available_now(doctor):
        raise ConflictError(f"{doctor.name} is not available right now. Please book a time instead.")
    now = clinic_now()
    return _create(db, patient, doctor, now.date(), now.strftime("%H:%M"), AppointmentType.INSTANT, req.notes,
                   _own_case_id(db, patient, req.triage_case_id))


def _create(db, patient, doctor: Doctor, slot_date, slot_time, kind, notes, case_id) -> AppointmentOut:
    appointment = Appointment(
        id=new_id("apt"),
        patient_id=patient.id,
        doctor_id=doctor.id,
        slot_date=slot_date,
        slot_time=slot_time,
        appointment_type=kind,
        notes=notes,
        triage_case_id=case_id,
    )
    db.add(appointment)
    label = "Consultation request" if kind == AppointmentType.INSTANT else "Appointment request"
    notification_service.notify(
        db, patient.id, f"{label} sent", f"Waiting for {doctor.name} to confirm ({slot_date} {slot_time}).", "APPOINTMENT"
    )
    notification_service.notify(
        db, doctor.user_id, f"New {label.lower()}", f"{patient.name} requested {slot_date} {slot_time}.", "APPOINTMENT"
    )
    audit_service.record(db, patient.id, "APPOINTMENT_REQUEST", "appointments", appointment.id)
    db.commit()
    db.refresh(appointment)
    return to_out(appointment)


def list_for_patient(db: Session, patient: User) -> list[AppointmentOut]:
    query = select(Appointment).where(Appointment.patient_id == patient.id).order_by(
        Appointment.slot_date.desc(), Appointment.slot_time.desc()
    )
    return [to_out(a) for a in db.scalars(query)]


def cancel(db: Session, patient: User, appointment_id: str) -> AppointmentOut:
    appointment = db.scalar(select(Appointment).where(Appointment.id == appointment_id, Appointment.patient_id == patient.id))
    if appointment is None:
        raise NotFoundError("Appointment not found.")
    if appointment.status not in _OPEN:
        raise AppError(f"A {appointment.status.lower()} appointment cannot be cancelled.")
    appointment.status = AppointmentStatus.CANCELLED
    notification_service.notify(db, appointment.doctor.user_id, "Appointment cancelled",
                                f"{patient.name} cancelled {appointment.slot_date} {appointment.slot_time}.", "APPOINTMENT")
    audit_service.record(db, patient.id, "APPOINTMENT_CANCEL", "appointments", appointment.id)
    db.commit()
    return to_out(appointment)


def list_for_doctor(db: Session, doctor: Doctor) -> list[AppointmentOut]:
    query = select(Appointment).where(Appointment.doctor_id == doctor.id).order_by(Appointment.slot_date, Appointment.slot_time)
    return [to_out(a) for a in db.scalars(query)]


_ALLOWED_TRANSITIONS = {
    AppointmentStatus.REQUESTED: {AppointmentStatus.CONFIRMED, AppointmentStatus.REJECTED},
    AppointmentStatus.CONFIRMED: {AppointmentStatus.COMPLETED},
}


def update_status(db: Session, doctor: Doctor, appointment_id: str, new_status: str) -> AppointmentOut:
    appointment = db.scalar(select(Appointment).where(Appointment.id == appointment_id, Appointment.doctor_id == doctor.id))
    if appointment is None:
        raise NotFoundError("Appointment not found.")
    if new_status not in _ALLOWED_TRANSITIONS.get(appointment.status, set()):
        raise AppError(f"Cannot change a {appointment.status.lower()} appointment to {new_status.lower()}.")
    appointment.status = new_status
    notification_service.notify(
        db, appointment.patient_id, f"Appointment {new_status.lower()}",
        f"{doctor.name}: {appointment.slot_date} {appointment.slot_time} is now {new_status.lower()}.", "APPOINTMENT",
    )
    audit_service.record(db, doctor.user_id, f"APPOINTMENT_{new_status}", "appointments", appointment.id)
    db.commit()
    return to_out(appointment)
