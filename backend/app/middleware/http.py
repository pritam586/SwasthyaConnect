"""Security headers and access logging (method, path, status, duration only; no bodies or tokens)."""

from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request

logger = logging.getLogger("swasthya.access")

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    # API responses carry patient data: never cache them in shared caches.
    "Cache-Control": "no-store",
}


def register_http_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def _security_and_logging(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        duration_ms = (time.perf_counter() - started) * 1000
        logger.info("%s %s -> %s (%.0f ms)", request.method, request.url.path, response.status_code, duration_ms)
        return response
