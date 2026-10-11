"""Eye-image screening: validate the upload, call the ML service, store the result."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.constants import IMAGE_FILE_TYPES, SCREENING_DISCLAIMER, FileKind, ScreeningLabel
from app.models import ScreeningResult, User, new_id
from app.schemas.clinical import ScreeningOut
from app.services import audit_service, file_service, ml_client, notification_service
from app.utils.errors import PayloadTooLargeError, UnsupportedMediaError


def screen(db: Session, patient: User, image: bytes, content_type: str | None, file_name: str | None) -> ScreeningOut:
    if content_type not in IMAGE_FILE_TYPES:
        raise UnsupportedMediaError("Upload a JPEG, PNG or WebP photo of the eye.")
    if len(image) > get_settings().max_upload_bytes:
        raise PayloadTooLargeError(f"The photo is larger than {get_settings().max_upload_mb} MB.")

    analysis = ml_client.analyze_eye_image(image, content_type, file_name or "eye.jpg")

    if not analysis.quality_passed:
        # Nothing is stored for a photo that failed the quality gate; the patient retakes it.
        return ScreeningOut(
            id=None,
            screening_label=ScreeningLabel.INCONCLUSIVE,
            confidence=0.0,
            triage_level="YELLOW",
            quality_passed=False,
            quality_reason=analysis.quality_reason,
            explanation=analysis.explanation or analysis.quality_reason,
            model_version=analysis.model_version,
            disclaimer=SCREENING_DISCLAIMER,
        )

    image_file = file_service.store(db, patient.id, FileKind.EYE_IMAGE, content_type, file_name, image)
    heatmap_file = (
        file_service.store(db, patient.id, FileKind.HEATMAP, "image/png", "heatmap.png", analysis.heatmap_png)
        if analysis.heatmap_png
        else None
    )
    result = ScreeningResult(
        id=new_id("scr"),
        patient_id=patient.id,
        image_file_id=image_file.id,
        heatmap_file_id=heatmap_file.id if heatmap_file else None,
        model_version=analysis.model_version or "unknown",
        screening_label=analysis.screening_label,
        confidence=analysis.confidence,
        triage_level=analysis.triage_level,
        quality_passed=True,
        explanation=analysis.explanation,
        disclaimer=SCREENING_DISCLAIMER,
    )
    db.add(result)
    notification_service.notify(db, patient.id, "Screening complete",
                                "Your eye-photo screening result is ready. It is not a diagnosis.", "SCREENING")
    audit_service.record(db, patient.id, "SCREENING_CREATE", "screening_results", result.id)
    db.commit()
    db.refresh(result)
    return ScreeningOut.model_validate(result)


def list_for_patient(db: Session, patient: User) -> list[ScreeningResult]:
    query = select(ScreeningResult).where(ScreeningResult.patient_id == patient.id).order_by(ScreeningResult.created_at.desc())
    return list(db.scalars(query))
