"""Shared schema pieces."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class ApiModel(BaseModel):
    """Base for every request/response schema.

    SQLite returns timezone-naive datetimes (stored as UTC); marking them UTC here means every
    timestamp leaves the API with an explicit offset, whichever database is in use.
    """

    @field_validator("*", mode="after")
    @classmethod
    def _utc_datetimes(cls, value: Any) -> Any:
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class OrmModel(ApiModel):
    model_config = ConfigDict(from_attributes=True)


class Message(ApiModel):
    message: str
