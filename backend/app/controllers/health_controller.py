"""Liveness/readiness check for the hosting platform. Reveals no versions or configuration."""

from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config.database import check_database_connection

router = APIRouter(tags=["health"])
logger = logging.getLogger("swasthya.health")


@router.get("/health")
def health() -> JSONResponse:
    try:
        check_database_connection()
    except Exception:  # any driver error means "not ready"
        logger.exception("Health check: database unreachable")
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return JSONResponse(content={"status": "ok"})
