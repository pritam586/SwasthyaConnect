"""Doctor profiles, verification state, weekly availability and live status."""

from __future__ import annotations

from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, SmallInteger, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import DoctorVerification
from app.models.base import Base, TimestampMixin


class Doctor(TimestampMixin, Base):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    specialization: Mapped[str] = mapped_column(String(120), nullable=False)
    qualification: Mapped[str] = mapped_column(String(120), nullable=False)
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    license_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    clinic_name: Mapped[str | None] = mapped_column(String(150))
    location: Mapped[str | None] = mapped_column(String(200))
    consultation_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # New registrations stay PENDING until an admin checks the licence.
    verification_status: Mapped[str] = mapped_column(
        String(10), index=True, default=DoctorVerification.PENDING, nullable=False
    )
    # Set by the doctor from the workstation ("I'm available now").
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="doctor_profile")  # noqa: F821
    availability: Mapped[list[DoctorAvailability]] = relationship(
        back_populates="doctor", cascade="all, delete-orphan", order_by="DoctorAvailability.day_of_week"
    )


class DoctorAvailability(Base):
    """A weekly consulting window in the clinic's timezone (0 = Monday)."""

    __tablename__ = "doctor_availabilities"
    __table_args__ = (UniqueConstraint("doctor_id", "day_of_week", "start_time", name="uq_availability_slot"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), index=True, nullable=False)
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    doctor: Mapped[Doctor] = relationship(back_populates="availability")
