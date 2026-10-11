"""Screening, triage, reports and clinician workflow payloads."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import ApiModel, OrmModel


class ScreeningOut(OrmModel):
    id: str | None
    screening_label: Literal["anemia_likely", "anemia_unlikely", "inconclusive"]
    confidence: float
    triage_level: str
    quality_passed: bool
    quality_reason: str | None = None
    explanation: str | None
    model_version: str | None
    image_file_id: str | None = None
    heatmap_file_id: str | None = None
    disclaimer: str
    created_at: datetime | None = None


class TriageRequest(ApiModel):
    """Symptoms as plain statements; the screening is referenced by id, never sent as values,
    so a client cannot invent a screening result."""

    symptoms: list[str] = Field(min_length=1, max_length=20)
    screening_id: str | None = Field(default=None, max_length=40)


class TriageOut(OrmModel):
    id: str
    urgency: Literal["green", "yellow", "red"]
    summary: str
    explanation: str
    visual_confidence: float
    screening_id: str | None
    status: str
    disclaimer: str
    created_at: datetime


class PrescriptionMedicine(ApiModel):
    name: str = Field(min_length=2, max_length=150)
    dosage: str = Field(min_length=1, max_length=100)
    frequency: str = Field(min_length=1, max_length=100)
    duration: str = Field(min_length=1, max_length=60)
    instructions: str | None = Field(default=None, max_length=500)


class CasePrescriptionRequest(ApiModel):
    diagnosis: str = Field(min_length=3, max_length=500)
    clinical_notes: str | None = Field(default=None, max_length=2000)
    medicines: list[PrescriptionMedicine] = Field(min_length=1, max_length=20)


class CaseOut(ApiModel):
    id: str
    patient_id: str
    patient_name: str
    age: int | None
    gender: str | None
    location: str | None
    abha_id: str | None
    urgency: str
    status: str
    symptoms: list[str]
    summary: str
    explanation: str
    visual_confidence: float
    screening: dict[str, Any] | None
    diagnosis: str | None
    clinical_notes: str | None
    created_at: datetime


class ReportOut(OrmModel):
    id: str
    report_title: str
    report_type: str
    original_file_name: str
    file_type: str
    file_id: str
    extracted_medicines: list[dict[str, Any]]
    summary: str | None
    created_at: datetime


class AbhaLinkRequest(ApiModel):
    abha_number: str = Field(default="", max_length=20)
    consent_granted: bool = False


class AbhaLinkResponse(ApiModel):
    integration_status: Literal["sandbox_mode", "invalid"]
    linked: bool
    abha_number: str | None
    # Mocked: no public PM-JAY verification API exists, so this is illustrative only.
    pmjay_mock_eligible: bool
    message: str
