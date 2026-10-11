"""When may a doctor see a patient's records?

Only through a clinical workflow: the patient has a triage case in the review queue, or
has an appointment with this doctor. A doctor cannot browse arbitrary patients.
"""

from __future__ import annotations

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.constants import DoctorVerification
from app.models import Appointment, TriageCase, User


def doctor_can_access_patient(db: Session, doctor_user: User, patient_id: str) -> bool:
    doctor = doctor_user.doctor_profile
    if doctor is None or doctor.verification_status != DoctorVerification.VERIFIED:
        return False
    in_queue = db.scalar(select(exists().where(TriageCase.patient_id == patient_id)))
    has_appointment = db.scalar(
        select(exists().where(Appointment.patient_id == patient_id, Appointment.doctor_id == doctor.id))
    )
    return bool(in_queue or has_appointment)
