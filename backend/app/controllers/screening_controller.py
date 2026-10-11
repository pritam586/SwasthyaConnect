"""/api/v1/screenings and /api/v1/triage: eye-photo screening and symptom triage."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import require_patient
from app.models import User
from app.schemas.clinical import ScreeningOut, TriageOut, TriageRequest
from app.services import screening_service, triage_service

screening_router = APIRouter(tags=["screenings"])
triage_router = APIRouter(tags=["triage"])


@screening_router.post("", response_model=ScreeningOut)
async def create_screening(image: UploadFile = File(...), user: User = Depends(require_patient),
                           db: Session = Depends(get_db)) -> ScreeningOut:
    content = await image.read()
    return screening_service.screen(db, user, content, image.content_type, image.filename)


@screening_router.get("", response_model=list[ScreeningOut])
def list_screenings(user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return screening_service.list_for_patient(db, user)


@triage_router.post("/cases", response_model=TriageOut, status_code=status.HTTP_201_CREATED)
def create_case(req: TriageRequest, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> TriageOut:
    return triage_service.create_case(db, user, req)


@triage_router.get("/cases", response_model=list[TriageOut])
def my_cases(user: User = Depends(require_patient), db: Session = Depends(get_db)) -> list[TriageOut]:
    return triage_service.list_for_patient(db, user)
