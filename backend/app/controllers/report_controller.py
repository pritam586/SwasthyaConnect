"""/api/v1/reports: the patient's uploaded medical reports."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import require_patient
from app.models import User
from app.schemas.clinical import ReportOut
from app.schemas.common import Message
from app.services import report_service

router = APIRouter(tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    report_title: str = Form(default="Medical report", max_length=150),
    report_type: str = Form(default="Lab report", max_length=80),
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    content = await file.read()
    return report_service.upload(db, user, report_title, report_type, file.filename, file.content_type, content)


@router.get("", response_model=list[ReportOut])
def list_reports(user: User = Depends(require_patient), db: Session = Depends(get_db)):
    return report_service.list_for_patient(db, user)


@router.delete("/{report_id}", response_model=Message)
def delete_report(report_id: str, user: User = Depends(require_patient), db: Session = Depends(get_db)) -> Message:
    report_service.delete(db, user, report_id)
    return Message(message="Report deleted.")
