"""Safe API boundary for Pratik Singh's symptom and speech triage module.

This service records structured symptom responses for clinician review. It does
not diagnose, prescribe, recommend treatment, classify urgency, or trigger
emergency actions. Those capabilities require separately validated,
clinician-approved logic and are deliberately not implemented here.
"""

from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


DISCLAIMER = (
    "Informational symptom collection only. A licensed clinician must assess "
    "symptoms and make every diagnosis, treatment, and escalation decision."
)
MAX_ANSWERS = 20
MAX_ANSWER_LENGTH = 500


class VisualScreeningContext(BaseModel):
    """Optional, untrusted context from Module 1; never a clinical conclusion."""

    status: Literal["available", "inconclusive", "unavailable"]
    quality_passed: bool = False
    model_version: str | None = Field(default=None, max_length=100)


class TriageRequest(BaseModel):
    symptom_answers: list[str] = Field(min_length=1, max_length=MAX_ANSWERS)
    transcript: str | None = Field(default=None, max_length=4_000)
    visual_screening: VisualScreeningContext | None = None


class TriageResponse(BaseModel):
    status: Literal["inconclusive"]
    clinician_review_required: Literal[True]
    reasons: list[str]
    disclaimer: str


app = FastAPI(title="SwasthyaConnect symptom triage", version="0.1.0")


def approved_triage_logic_is_available() -> bool:
    """Reserved deployment gate for a future reviewed triage implementation."""
    return os.getenv("TRIAGE_LOGIC_APPROVED", "false").lower() == "true"


@app.post("/api/v1/triage/assess", response_model=TriageResponse)
async def assess_symptoms(request: TriageRequest) -> TriageResponse:
    """Accept symptom data while failing closed until approved logic exists."""
    if any(not answer.strip() or len(answer) > MAX_ANSWER_LENGTH for answer in request.symptom_answers):
        # Pydantic validates shape; this avoids silently accepting blank or
        # oversized responses if an integration bypasses the frontend.
        return TriageResponse(
            status="inconclusive",
            clinician_review_required=True,
            reasons=["Symptom responses are incomplete or invalid."],
            disclaimer=DISCLAIMER,
        )

    reasons = ["Triage logic has not been validated for clinical use."]
    if request.visual_screening and request.visual_screening.status != "available":
        reasons.append("No validated visual-screening input is available.")
    if approved_triage_logic_is_available():
        reasons.append("Approved decision logic is not implemented in this service.")

    return TriageResponse(
        status="inconclusive",
        clinician_review_required=True,
        reasons=reasons,
        disclaimer=DISCLAIMER,
    )
