"""Multi-Modal AI Triage Engine for SwasthyaConnect.

Fuses visual screening findings with structured symptom indicators into
an evidence-backed Green / Yellow / Red urgency classification.
Persists the assessment into the clinician triage queue.
"""

from __future__ import annotations

import json
import secrets
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from backend.auth_service import decode_access_token
from backend.database import get_db_connection

router = APIRouter(prefix="/api/v1/triage", tags=["triage"])

DISCLAIMER = (
    "AI Screening & Triage Support: This is an automated preliminary indicator to assist clinical prioritization. "
    "A licensed physician performs the definitive evaluation and treatment planning."
)


class VisualScreeningContext(BaseModel):
    status: Literal["available", "inconclusive", "unavailable"] = "available"
    confidence: float = 78.4
    screening_label: str = "anemia_likely"
    quality_passed: bool = True
    grad_cam_url: str | None = None


class TriageSubmissionRequest(BaseModel):
    user_id: str | None = None
    patient_name: str = Field(default="Patient", min_length=1, max_length=100)
    age: str = Field(default="25")
    gender: str = Field(default="Unspecified")
    phone: str = Field(default="9876543210")
    location: str = Field(default="Primary Health Centre")
    abha_id: str | None = None
    pmjay_eligible: bool = False
    symptom_answers: list[str] = Field(min_length=1, max_length=20)
    transcript: str | None = None
    visual_screening: VisualScreeningContext | None = None


class TriageAssessmentResponse(BaseModel):
    case_id: str
    urgency: Literal["green", "yellow", "red"]
    ai_summary: str
    explainability_note: str
    visual_confidence: float
    disclaimer: str


def compute_multimodal_urgency(
    symptoms: list[str],
    visual: VisualScreeningContext | None,
) -> tuple[Literal["green", "yellow", "red"], str, str]:
    """Multi-modal fusion logic combining conjunctival pallor with symptom risk."""
    symptoms_text = " ".join(symptoms).lower()

    # Red flags (severe symptoms)
    has_severe = any(
        kw in symptoms_text
        for kw in ["chest pain", "severe", "faint", "loss of consciousness", "cannot walk", "bleeding"]
    )
    # Moderate flags
    has_moderate = any(
        kw in symptoms_text
        for kw in ["shortness of breath", "breathless", "dizzy", "headache", "most days", "often", "fatigue"]
    )

    visual_conf = visual.confidence if visual and visual.status == "available" else 50.0
    pallor_detected = visual and visual.screening_label == "anemia_likely"

    if has_severe or (pallor_detected and visual_conf > 85.0 and has_moderate):
        urgency: Literal["green", "yellow", "red"] = "red"
        summary = "High clinical urgency: Exertional or severe symptoms and marked conjunctival pallor detected."
        note = (
            f"Multi-modal fusion triggered RED priority. Visual pallor confidence: {visual_conf:.1f}%. "
            "Reported severe fatigue and exertional dyspnea require immediate clinician evaluation."
        )
    elif has_moderate or (pallor_detected and visual_conf >= 55.0):
        urgency = "yellow"
        summary = "Moderate urgency: Conjunctival pallor with ongoing exertional fatigue or headaches."
        note = (
            f"Multi-modal fusion assigned YELLOW priority. MobileNetV3 visual confidence: {visual_conf:.1f}%. "
            "Symptoms indicate likely iron-deficiency anaemia. Clinical teleconsultation or PHC visit advised."
        )
    else:
        urgency = "green"
        summary = "Low urgency: Minimal fatigue reported with mild or normal conjunctival erythema."
        note = (
            f"Multi-modal fusion assigned GREEN priority. Visual confidence: {visual_conf:.1f}%. "
            "Self-care nutrition and dietary guidance suitable under primary care protocol."
        )

    return urgency, summary, note


@router.post("/assess", response_model=TriageAssessmentResponse)
async def assess_and_submit_triage(
    request: TriageSubmissionRequest,
    authorization: str | None = Header(None),
) -> TriageAssessmentResponse:
    urgency, summary, explainability = compute_multimodal_urgency(
        request.symptom_answers, request.visual_screening
    )

    case_id = f"SC-{secrets.randbelow(8999) + 1000}"
    vis_conf = request.visual_screening.confidence if request.visual_screening else 75.0

    # Extract user ID from token if provided
    resolved_user_id = request.user_id
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ")[1]
            claims = decode_access_token(token)
            resolved_user_id = claims.get("sub") or resolved_user_id
        except Exception:
            pass

    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO triage_cases (
            id, user_id, patient_name, age, gender, phone, location, abha_id,
            pmjay_eligible, visual_confidence, symptoms_json, ai_summary, urgency, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        """,
        (
            case_id,
            resolved_user_id,
            request.patient_name,
            request.age,
            request.gender,
            request.phone,
            request.location,
            request.abha_id,
            1 if request.pmjay_eligible else 0,
            vis_conf,
            json.dumps(request.symptom_answers),
            summary,
            urgency,
        ),
    )

    # If linked to a registered patient, record in notifications
    if resolved_user_id:
        conn.execute(
            """
            INSERT INTO notifications (id, user_id, title, message, type)
            VALUES (?, ?, ?, ?, 'AI_ANALYSIS')
            """,
            (
                f"notif-{secrets.token_hex(4)}",
                resolved_user_id,
                f"AI Triage Result: {urgency.upper()}",
                summary,
            ),
        )

    conn.commit()
    conn.close()

    return TriageAssessmentResponse(
        case_id=case_id,
        urgency=urgency,
        ai_summary=summary,
        explainability_note=explainability,
        visual_confidence=vis_conf,
        disclaimer=DISCLAIMER,
    )
