"""ABHA / Ayushman Bharat Digital Mission Integration Layer for SwasthyaConnect.

Supports ABDM Milestone 1 verification & consent flow with optional skip
so rural patients without an ABHA card can still receive care.
"""

from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

ABHA_PATTERN = re.compile(r"^\d{2}-?\d{4}-?\d{4}-?\d{4}$")
router = APIRouter(prefix="/api/v1/abha", tags=["abha"])
app = FastAPI(title="SwasthyaConnect ABHA integration", version="0.2.0")


class AbhaLinkRequest(BaseModel):
    abha_number: str = Field(default="")
    consent_granted: bool = False
    skip: bool = False


class AbhaLinkResponse(BaseModel):
    integration_status: Literal["linked", "optional_skipped", "sandbox_mode"]
    linked: bool
    pmjay_eligible: bool
    annual_coverage_inr: int
    abha_number: str | None
    message: str


@router.post("/link", response_model=AbhaLinkResponse)
@app.post("/api/v1/abha/link", response_model=AbhaLinkResponse)
async def link_or_skip_abha(request: AbhaLinkRequest) -> AbhaLinkResponse:
    if request.skip:
        return AbhaLinkResponse(
            integration_status="optional_skipped",
            linked=False,
            pmjay_eligible=False,
            annual_coverage_inr=0,
            abha_number=None,
            message="ABHA verification skipped. Proceeding with standard telehealth patient ID.",
        )

    abha_input = request.abha_number.strip()
    if ABHA_PATTERN.match(abha_input):
        if not request.consent_granted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient consent is required before linking an ABHA number.",
            )
        clean_abha = abha_input.replace("-", "")
        formatted = f"{clean_abha[0:2]}-{clean_abha[2:6]}-{clean_abha[6:10]}-{clean_abha[10:14]}"
        # Live ABDM Sandbox calls are not wired yet: the number is format-checked
        # and PM-JAY eligibility is a mocked response (no public PM-JAY API exists).
        return AbhaLinkResponse(
            integration_status="sandbox_mode",
            linked=True,
            pmjay_eligible=True,
            annual_coverage_inr=500000,
            abha_number=formatted,
            message=(
                f"ABHA ID {formatted} accepted (sandbox mode, not yet verified with ABDM). "
                "PM-JAY eligibility shown is a mocked result."
            ),
        )

    return AbhaLinkResponse(
        integration_status="optional_skipped",
        linked=False,
        pmjay_eligible=False,
        annual_coverage_inr=0,
        abha_number=None,
        message=(
            "ABHA number must be 14 digits (e.g. 12-3456-7890-1234)."
            if abha_input
            else "No ABHA number provided. Continuing as unregistered guest."
        ),
    )
