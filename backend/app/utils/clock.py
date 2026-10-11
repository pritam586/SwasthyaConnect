"""Time helpers. Availability windows and slots use the clinic's local timezone."""

from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.config.settings import get_settings


def utcnow() -> datetime:
    return datetime.now(UTC)


def clinic_now() -> datetime:
    return datetime.now(ZoneInfo(get_settings().clinic_timezone))


def as_utc(value: datetime) -> datetime:
    """SQLite returns naive datetimes even for timezone-aware columns; they are stored as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=UTC)
