"""Audit trail of security-relevant actions. Rows are added to the caller's transaction."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AuditLog, new_id


def record(db: Session, user_id: str | None, action: str, resource_type: str, resource_id: str | None = None) -> None:
    db.flush()  # the audited row may be new in this transaction; insert it first
    db.add(AuditLog(id=new_id("aud"), user_id=user_id, action=action, resource_type=resource_type, resource_id=resource_id))
