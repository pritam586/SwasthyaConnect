"""Database-backed file storage plus the rule for who may download a file."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.constants import Role
from app.models import StoredFile, User, new_id
from app.services import access_service
from app.utils.documents import safe_file_name
from app.utils.errors import NotFoundError


def store(db: Session, owner_id: str, kind: str, content_type: str, file_name: str | None, data: bytes) -> StoredFile:
    stored = StoredFile(
        id=new_id("fil"),
        owner_id=owner_id,
        kind=kind,
        content_type=content_type,
        file_name=safe_file_name(file_name, default=kind.lower()),
        size_bytes=len(data),
        data=data,
    )
    db.add(stored)
    # Flush now: rows that reference this file have no ORM relationship to order the inserts.
    db.flush()
    return stored


def get_for_user(db: Session, user: User, file_id: str) -> StoredFile:
    """Owners see their files; verified doctors only for patients in their workflows; admins never
    (they manage accounts, not medical records)."""
    stored = db.get(StoredFile, file_id)
    if stored is None:
        raise NotFoundError("File not found.")
    if stored.owner_id == user.id:
        return stored
    if user.role == Role.DOCTOR and access_service.doctor_can_access_patient(db, user, stored.owner_id):
        return stored
    # Same response as a missing file, so ids of other patients' files cannot be probed.
    raise NotFoundError("File not found.")
