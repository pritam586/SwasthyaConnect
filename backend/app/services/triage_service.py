"""Rule-based triage: fuses reported symptoms with the patient's own screening result.

Keyword rules, not a clinical model. The output orders the clinician queue; it is
never a diagnosis.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import TRIAGE_DISCLAIMER, ScreeningLabel, Urgency
from app.models import ScreeningResult, TriageCase, User, new_id
from app.schemas.clinical import TriageOut, TriageRequest
from app.services import audit_service, notification_service
from app.utils.errors import NotFoundError

SEVERE_KEYWORDS = ("chest pain", "severe", "faint", "loss of consciousness", "cannot walk", "bleeding")
MODERATE_KEYWORDS = ("shortness of breath", "breathless", "dizzy", "headache", "most days", "often", "fatigue")


def assess(symptoms: list[str], screening: ScreeningResult | None) -> tuple[str, str, str, float]:
    """Returns (urgency, summary, explanation, visual confidence used)."""
    text = " ".join(symptoms).lower()
    has_severe = any(keyword in text for keyword in SEVERE_KEYWORDS)
    has_moderate = any(keyword in text for keyword in MODERATE_KEYWORDS)

    usable = screening is not None and screening.quality_passed and screening.screening_label != ScreeningLabel.INCONCLUSIVE
    confidence = screening.confidence if usable else 0.0
    pallor = usable and screening.screening_label == ScreeningLabel.ANEMIA_LIKELY

    if pallor:
        visual = f"conjunctival pallor flagged by visual screening ({confidence:.1f}% confidence)"
    elif usable:
        visual = f"no conjunctival pallor flagged by visual screening ({confidence:.1f}% confidence)"
    else:
        visual = "no usable visual screening result (triage based on symptoms only)"

    if has_severe:
        reported = "severe symptoms reported"
    elif has_moderate:
        reported = "moderate symptoms reported (fatigue, dizziness, headache or breathlessness)"
    else:
        reported = "no moderate or severe symptoms reported"

    if has_severe or (pallor and confidence > 85.0 and has_moderate):
        return Urgency.RED, f"High urgency: {reported}; {visual}.", "RED priority. Immediate clinician evaluation required.", confidence
    if has_moderate or (pallor and confidence >= 55.0):
        return (Urgency.YELLOW, f"Moderate urgency: {reported}; {visual}.",
                "YELLOW priority. Clinician review by teleconsultation or PHC visit advised.", confidence)
    return (Urgency.GREEN, f"Low urgency: {reported}; {visual}.",
            "GREEN priority. Self-care and dietary guidance under primary care protocol.", confidence)


def create_case(db: Session, patient: User, req: TriageRequest) -> TriageOut:
    screening = None
    if req.screening_id:
        screening = db.scalar(
            select(ScreeningResult).where(ScreeningResult.id == req.screening_id, ScreeningResult.patient_id == patient.id)
        )
        if screening is None:
            raise NotFoundError("Screening result not found.")

    symptoms = [s.strip()[:300] for s in req.symptoms if s.strip()]
    urgency, summary, explanation, confidence = assess(symptoms, screening)
    case = TriageCase(
        id=new_id("tri"),
        patient_id=patient.id,
        screening_id=screening.id if screening else None,
        symptoms=symptoms,
        visual_confidence=confidence,
        summary=summary,
        explanation=explanation,
        urgency=urgency,
    )
    db.add(case)
    notification_service.notify(db, patient.id, f"Triage result: {urgency.upper()}", summary, "TRIAGE")
    audit_service.record(db, patient.id, "TRIAGE_CREATE", "triage_cases", case.id)
    db.commit()
    db.refresh(case)
    return to_out(case)


def to_out(case: TriageCase) -> TriageOut:
    return TriageOut(
        id=case.id,
        urgency=case.urgency,
        summary=case.summary,
        explanation=case.explanation,
        visual_confidence=case.visual_confidence,
        screening_id=case.screening_id,
        status=case.status,
        disclaimer=TRIAGE_DISCLAIMER,
        created_at=case.created_at,
    )


def list_for_patient(db: Session, patient: User) -> list[TriageOut]:
    query = select(TriageCase).where(TriageCase.patient_id == patient.id).order_by(TriageCase.created_at.desc())
    return [to_out(case) for case in db.scalars(query)]
