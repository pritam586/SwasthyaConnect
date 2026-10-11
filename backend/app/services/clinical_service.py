"""Doctor workstation: urgency-sorted case queue, case detail, and prescription issue."""

from __future__ import annotations

from sqlalchemy import case as sql_case
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.constants import CaseStatus, MedicationStatus
from app.models import Doctor, HealthEncounter, Medication, Prescription, ScreeningResult, TriageCase, new_id
from app.schemas.clinical import CaseOut, CasePrescriptionRequest
from app.services import audit_service, doctor_service, notification_service
from app.utils.clock import clinic_now
from app.utils.errors import AppError, NotFoundError

_URGENCY_ORDER = sql_case({"red": 0, "yellow": 1, "green": 2}, value=TriageCase.urgency, else_=3)


def _to_out(case: TriageCase, screening: ScreeningResult | None) -> CaseOut:
    patient = case.patient
    return CaseOut(
        id=case.id,
        patient_id=patient.id,
        patient_name=patient.name,
        age=patient.age,
        gender=patient.gender,
        location=patient.location,
        abha_id=patient.abha_id,
        urgency=case.urgency,
        status=case.status,
        symptoms=case.symptoms,
        summary=case.summary,
        explanation=case.explanation,
        visual_confidence=case.visual_confidence,
        screening=(
            {"id": screening.id, "screening_label": screening.screening_label, "confidence": screening.confidence,
             "heatmap_file_id": screening.heatmap_file_id, "image_file_id": screening.image_file_id,
             "model_version": screening.model_version, "explanation": screening.explanation}
            if screening else None
        ),
        diagnosis=case.diagnosis,
        clinical_notes=case.clinical_notes,
        created_at=case.created_at,
    )


def list_cases(db: Session, doctor: Doctor, status: str | None = CaseStatus.PENDING) -> list[CaseOut]:
    doctor_service.touch(db, doctor)
    query = select(TriageCase).options(selectinload(TriageCase.patient)).order_by(_URGENCY_ORDER, TriageCase.created_at)
    if status:
        query = query.where(TriageCase.status == status)
    cases = list(db.scalars(query))
    screening_ids = [c.screening_id for c in cases if c.screening_id]
    screenings = {s.id: s for s in db.scalars(select(ScreeningResult).where(ScreeningResult.id.in_(screening_ids)))} if screening_ids else {}
    return [_to_out(c, screenings.get(c.screening_id)) for c in cases]


def get_case(db: Session, case_id: str) -> CaseOut:
    case = db.get(TriageCase, case_id)
    if case is None:
        raise NotFoundError("Case not found.")
    return _to_out(case, db.get(ScreeningResult, case.screening_id) if case.screening_id else None)


def prescribe(db: Session, doctor: Doctor, case_id: str, req: CasePrescriptionRequest) -> CaseOut:
    case = db.get(TriageCase, case_id)
    if case is None:
        raise NotFoundError("Case not found.")
    if case.status == CaseStatus.REVIEWED:
        raise AppError("This case has already been reviewed.")

    today = clinic_now().date()
    medicines = [m.model_dump() for m in req.medicines]
    prescription = Prescription(
        id=new_id("rx"),
        patient_id=case.patient_id,
        doctor_id=doctor.id,
        doctor_name=doctor.name,
        triage_case_id=case.id,
        diagnosis=req.diagnosis,
        medicines=medicines,
        instructions=req.clinical_notes,
        prescription_date=today,
    )
    db.add(prescription)
    db.flush()
    for item in req.medicines:
        db.add(
            Medication(
                id=new_id("med"),
                patient_id=case.patient_id,
                medicine_name=item.name,
                generic_name=item.name,
                dosage=item.dosage,
                frequency=item.frequency,
                start_date=today,
                prescribed_by=doctor.name,
                prescription_id=prescription.id,
                status=MedicationStatus.ACTIVE,
                instructions=item.instructions or f"For {item.duration}",
            )
        )
    db.add(
        HealthEncounter(
            id=new_id("enc"),
            patient_id=case.patient_id,
            doctor_id=doctor.id,
            doctor_name=doctor.name,
            encounter_date=today,
            reason=f"Triage review ({case.urgency.upper()})",
            symptoms="; ".join(case.symptoms),
            diagnosis_notes=req.diagnosis,
            treatment_notes=req.clinical_notes,
            prescription_id=prescription.id,
        )
    )
    case.status = CaseStatus.REVIEWED
    case.reviewed_by_doctor_id = doctor.id
    case.diagnosis = req.diagnosis
    case.clinical_notes = req.clinical_notes
    notification_service.notify(db, case.patient_id, "New prescription",
                                f"{doctor.name} reviewed your case and issued a prescription.", "PRESCRIPTION")
    audit_service.record(db, doctor.user_id, "PRESCRIPTION_ISSUE", "prescriptions", prescription.id)
    db.commit()
    return get_case(db, case.id)
