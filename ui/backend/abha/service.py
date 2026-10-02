"""Safe ABDM Sandbox boundary for Module 3.

No ABHA identity, health records, or benefit eligibility are fabricated. Live
linking remains unavailable until the project has approved ABDM Sandbox
credentials, consent flow configuration, and a secure server-side integration.
"""

from __future__ import annotations

import os
import re
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


ABHA_PATTERN = re.compile(r"^\d{2}-\d{4}-\d{4}-\d{4}$")
app = FastAPI(title="SwasthyaConnect ABHA integration", version="0.1.0")


class AbhaLinkRequest(BaseModel):
    abha_number: str = Field(max_length=17)
    consent_granted: bool


class AbhaLinkResponse(BaseModel):
    integration_status: Literal["not_configured"]
    linked: Literal[False]
    message: str


def abdm_sandbox_is_configured() -> bool:
    """Require server-side configuration; never expose credentials to clients."""
    return bool(os.getenv("ABDM_SANDBOX_CLIENT_ID") and os.getenv("ABDM_SANDBOX_CLIENT_SECRET"))


@app.post("/api/v1/abha/link", response_model=AbhaLinkResponse)
async def link_abha(request: AbhaLinkRequest) -> AbhaLinkResponse:
    if not ABHA_PATTERN.fullmatch(request.abha_number):
        raise HTTPException(status_code=422, detail="Enter an ABHA number in the format 00-0000-0000-0000.")
    if not request.consent_granted:
        raise HTTPException(status_code=422, detail="Explicit consent is required before an ABHA link can begin.")
    # A configured sandbox is intentionally still blocked until the OAuth and
    # consent callbacks are implemented and independently reviewed.
    message = (
        "ABDM Sandbox credentials are configured, but the reviewed consent flow is not enabled."
        if abdm_sandbox_is_configured()
        else "ABDM Sandbox integration is not configured. No ABHA link was created."
    )
    return AbhaLinkResponse(integration_status="not_configured", linked=False, message=message)
