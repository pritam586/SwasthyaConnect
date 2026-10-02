"""Safe Module 4 boundary for clinician decisions and care coordination.

The service never invents a patient queue, eligibility result, prescription,
pharmacy stock result, or notification. It requires a future authenticated
clinician workflow before any decision may be recorded.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


app = FastAPI(title="SwasthyaConnect clinical workflow", version="0.1.0")


class CaseSummary(BaseModel):
    case_id: str
    clinician_review_required: bool
    source: str


class ClinicianDecisionRequest(BaseModel):
    clinician_id: str = Field(min_length=1, max_length=100)
    note: str = Field(min_length=1, max_length=4_000)


@app.get("/api/v1/clinical-workflow/cases", response_model=list[CaseSummary])
async def list_cases() -> list[CaseSummary]:
    """Return no cases until authenticated, consented storage is configured."""
    return []


@app.post("/api/v1/clinical-workflow/cases/{case_id}/clinician-decision")
async def record_clinician_decision(case_id: str, decision: ClinicianDecisionRequest) -> None:
    del case_id, decision
    raise HTTPException(
        status_code=503,
        detail="Authenticated clinician workflow is not configured. No decision, prescription, referral, or notification was created.",
    )
