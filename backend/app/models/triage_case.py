"""Symptom + screening triage cases queued for clinician review."""

from __future__ import annotations

from sqlalchemy import JSON, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import CaseStatus
from app.models.base import Base, TimestampMixin


class TriageCase(TimestampMixin, Base):
    """A patient's fused symptom + screening assessment, queued for clinician review."""

    __tablename__ = "triage_cases"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    screening_id: Mapped[str | None] = mapped_column(ForeignKey("screening_results.id", ondelete="SET NULL"))
    symptoms: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    visual_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    urgency: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(10), index=True, default=CaseStatus.PENDING, nullable=False)
    reviewed_by_doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctors.id", ondelete="SET NULL"))
    diagnosis: Mapped[str | None] = mapped_column(Text)
    clinical_notes: Mapped[str | None] = mapped_column(Text)

    patient: Mapped["User"] = relationship()  # noqa: F821
