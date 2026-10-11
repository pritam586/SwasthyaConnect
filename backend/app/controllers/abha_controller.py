"""/api/v1/abha: link or unlink the patient's ABHA number (sandbox mode)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import require_patient
from app.models import User
from app.schemas.clinical import AbhaLinkRequest, AbhaLinkResponse
from app.schemas.common import Message
from app.services import abha_service

router = APIRouter(tags=["abha"])


@router.post("/link", response_model=AbhaLinkResponse)
def link(req: AbhaLinkRequest, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> AbhaLinkResponse:
    return abha_service.link(db, user, req)


@router.delete("/link", response_model=Message)
def unlink(user: User = Depends(require_patient), db: Session = Depends(get_db)) -> Message:
    abha_service.unlink(db, user)
    return Message(message="ABHA number removed.")
