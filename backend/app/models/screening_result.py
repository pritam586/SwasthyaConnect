"""Visual anaemia screening output (screening support, not diagnosis)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ScreeningResult(Base):
    """Output of the visual anaemia screening model. Screening support, never a diagnosis."""

    __tablename__ = "screening_results"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    image_file_id: Mapped[str | None] = mapped_column(ForeignKey("stored_files.id", ondelete="SET NULL"))
    heatmap_file_id: Mapped[str | None] = mapped_column(ForeignKey("stored_files.id", ondelete="SET NULL"))
    model_version: Mapped[str] = mapped_column(String(80), nullable=False)
    screening_label: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)  # percent, 0-100
    triage_level: Mapped[str] = mapped_column(String(10), nullable=False)
    quality_passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
