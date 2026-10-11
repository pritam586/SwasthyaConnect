"""In-app notifications."""

from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Notification, new_id


def notify(db: Session, user_id: str, title: str, message: str, kind: str = "SYSTEM") -> None:
    db.flush()  # the recipient or related rows may be new in this transaction
    db.add(Notification(id=new_id("ntf"), user_id=user_id, title=title, message=message, type=kind))


def list_for_user(db: Session, user_id: str, limit: int = 30) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(limit)
    return list(db.scalars(query))


def mark_read(db: Session, user_id: str, notification_id: str) -> None:
    db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user_id)
        .values(is_read=True)
    )
    db.commit()
