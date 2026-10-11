"""Medical report upload, PDF text extraction and medicine matching."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.constants import REPORT_FILE_TYPES, FileKind
from app.models import MedicalReport, Medicine, StoredFile, User, new_id
from app.services import audit_service, file_service, notification_service
from app.utils.documents import extract_pdf_text, safe_file_name
from app.utils.errors import NotFoundError, PayloadTooLargeError, UnsupportedMediaError


def match_medicines(db: Session, text: str) -> list[dict]:
    """Catalogue medicines whose brand or generic name appears in the report text."""
    if not text:
        return []
    lowered = text.lower()
    matched = []
    for medicine in db.scalars(select(Medicine).where(Medicine.active.is_(True))):
        names = {medicine.name.lower(), medicine.generic_name.lower()}
        if any(name and name in lowered for name in names):
            matched.append(
                {"medicine_id": medicine.id, "name": medicine.name, "generic_name": medicine.generic_name,
                 "strength": medicine.strength, "form": medicine.form}
            )
    return matched


def upload(db: Session, patient: User, title: str, report_type: str, file_name: str | None,
           content_type: str | None, content: bytes) -> MedicalReport:
    if content_type not in REPORT_FILE_TYPES:
        raise UnsupportedMediaError("Upload a PDF, JPEG, PNG or WebP file.")
    if len(content) > get_settings().max_upload_bytes:
        raise PayloadTooLargeError(f"The file is larger than {get_settings().max_upload_mb} MB.")
    if not content:
        raise UnsupportedMediaError("The file is empty.")

    # Only PDFs with a text layer can be read; photos would need OCR, which is not implemented.
    text = extract_pdf_text(content) if content_type == "application/pdf" else ""
    medicines = match_medicines(db, text)
    if medicines:
        summary = "Medicines found in this report: " + ", ".join(m["name"] for m in medicines) + "."
    elif content_type == "application/pdf" and text:
        summary = "No catalogue medicines were found in this report's text."
    else:
        summary = "Stored. Text could not be read automatically (photo or scanned document)."

    stored = file_service.store(db, patient.id, FileKind.REPORT, content_type, file_name, content)
    report = MedicalReport(
        id=new_id("rep"),
        patient_id=patient.id,
        file_id=stored.id,
        report_title=title.strip() or "Medical report",
        report_type=report_type.strip() or "Lab report",
        original_file_name=safe_file_name(file_name, "report"),
        file_type=content_type,
        extracted_text=text or None,
        extracted_medicines=medicines,
        summary=summary,
    )
    db.add(report)
    notification_service.notify(db, patient.id, "Report uploaded", f"'{report.report_title}' was saved.", "REPORT")
    audit_service.record(db, patient.id, "REPORT_UPLOAD", "medical_reports", report.id)
    db.commit()
    return report


def list_for_patient(db: Session, patient: User) -> list[MedicalReport]:
    query = select(MedicalReport).where(MedicalReport.patient_id == patient.id).order_by(MedicalReport.created_at.desc())
    return list(db.scalars(query))


def delete(db: Session, patient: User, report_id: str) -> None:
    report = db.scalar(select(MedicalReport).where(MedicalReport.id == report_id, MedicalReport.patient_id == patient.id))
    if report is None:
        raise NotFoundError("Report not found.")
    stored = db.get(StoredFile, report.file_id)
    db.delete(report)
    db.flush()
    if stored is not None:
        db.delete(stored)
    audit_service.record(db, patient.id, "REPORT_DELETE", "medical_reports", report_id)
    db.commit()
