"""ABHA linking in sandbox mode.

Live ABDM Sandbox calls are not implemented: the number is format-checked and stored after
explicit consent. PM-JAY eligibility has no public API, so the returned flag is a mock and is
never written to the patient record.
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.models import User
from app.schemas.clinical import AbhaLinkRequest, AbhaLinkResponse
from app.services import audit_service
from app.utils.errors import AppError

ABHA_PATTERN = re.compile(r"^\d{2}-?\d{4}-?\d{4}-?\d{4}$")


def link(db: Session, patient: User, req: AbhaLinkRequest) -> AbhaLinkResponse:
    raw = req.abha_number.strip()
    if not ABHA_PATTERN.match(raw):
        return AbhaLinkResponse(
            integration_status="invalid", linked=False, abha_number=None, pmjay_mock_eligible=False,
            message="ABHA number must be 14 digits (e.g. 12-3456-7890-1234).",
        )
    if not req.consent_granted:
        raise AppError("Patient consent is required before linking an ABHA number.")
    digits = raw.replace("-", "")
    formatted = f"{digits[0:2]}-{digits[2:6]}-{digits[6:10]}-{digits[10:14]}"
    patient.abha_id = formatted
    audit_service.record(db, patient.id, "ABHA_LINK", "users", patient.id)
    db.commit()
    return AbhaLinkResponse(
        integration_status="sandbox_mode",
        linked=True,
        abha_number=formatted,
        pmjay_mock_eligible=True,
        message=f"ABHA ID {formatted} saved (sandbox mode, not yet verified with ABDM). "
        "PM-JAY eligibility shown is a mocked result.",
    )


def unlink(db: Session, patient: User) -> None:
    patient.abha_id = None
    audit_service.record(db, patient.id, "ABHA_UNLINK", "users", patient.id)
    db.commit()
