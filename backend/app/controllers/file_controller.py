"""/api/v1/files/{id}: authorised download of reports, eye images and heatmaps."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import get_current_user
from app.models import User
from app.services import file_service

router = APIRouter(tags=["files"])


@router.get("/{file_id}")
def download(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    stored = file_service.get_for_user(db, user, file_id)
    return Response(
        content=stored.data,
        media_type=stored.content_type,
        headers={
            "Content-Disposition": f'inline; filename="{stored.file_name}"',
            "Cache-Control": "private, no-store",
        },
    )
