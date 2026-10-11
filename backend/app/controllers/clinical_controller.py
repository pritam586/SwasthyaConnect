"""/api/v1/clinical: verified doctors' case queue and prescriptions."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import require_verified_doctor
from app.models import Doctor
from app.schemas.clinical import CaseOut, CasePrescriptionRequest
from app.services import clinical_service

router = APIRouter(tags=["clinical"])


@router.get("/cases", response_model=list[CaseOut])
def list_cases(
    status: Literal["pending", "reviewed", "all"] = Query(default="pending"),
    doctor: Doctor = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
) -> list[CaseOut]:
    return clinical_service.list_cases(db, doctor, None if status == "all" else status)


@router.get("/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: str, _doctor: Doctor = Depends(require_verified_doctor), db: Session = Depends(get_db)) -> CaseOut:
    return clinical_service.get_case(db, case_id)


@router.post("/cases/{case_id}/prescription", response_model=CaseOut)
def prescribe(case_id: str, req: CasePrescriptionRequest, doctor: Doctor = Depends(require_verified_doctor),
              db: Session = Depends(get_db)) -> CaseOut:
    return clinical_service.prescribe(db, doctor, case_id, req)
