"""HTTP client for the separate ML inference service (ml-service/).

The backend never computes or invents a screening result: if the ML service is not
configured, unreachable, or has no approved model, screening is reported as unavailable.
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass

import httpx

from app.config.settings import get_settings
from app.utils.errors import ServiceUnavailableError

logger = logging.getLogger("swasthya.ml_client")


@dataclass
class MlAnalysis:
    quality_passed: bool
    quality_reason: str
    screening_label: str
    confidence: float
    triage_level: str
    explanation: str
    model_version: str | None
    heatmap_png: bytes | None


def analyze_eye_image(image: bytes, content_type: str, file_name: str) -> MlAnalysis:
    settings = get_settings()
    if not settings.ml_service_url:
        raise ServiceUnavailableError("Visual screening is not available: the ML service is not configured.")
    headers = {"X-Internal-Token": settings.ml_service_token} if settings.ml_service_token else {}
    try:
        response = httpx.post(
            f"{settings.ml_service_url}/v1/analyze",
            files={"image": (file_name, image, content_type)},
            headers=headers,
            timeout=settings.ml_timeout_seconds,
        )
    except httpx.HTTPError as error:
        logger.warning("ML service unreachable: %s", type(error).__name__)
        raise ServiceUnavailableError("Visual screening is temporarily unavailable. Please try again later.") from error

    if response.status_code == 503:
        raise ServiceUnavailableError(_detail(response, "Visual screening is not available: no approved model is loaded."))
    if response.status_code != 200:
        logger.warning("ML service returned HTTP %s", response.status_code)
        raise ServiceUnavailableError("Visual screening failed. Please try again later.")

    body = response.json()
    heatmap = body.get("heatmap_png_base64")
    return MlAnalysis(
        quality_passed=bool(body["quality_passed"]),
        quality_reason=body.get("quality_reason") or "",
        screening_label=body["screening_label"],
        confidence=float(body["confidence"]),
        triage_level=body["triage_level"],
        explanation=body.get("explanation") or "",
        model_version=body.get("model_version"),
        heatmap_png=base64.b64decode(heatmap) if heatmap else None,
    )


def _detail(response: httpx.Response, fallback: str) -> str:
    try:
        detail = response.json().get("detail")
        return detail if isinstance(detail, str) else fallback
    except ValueError:
        return fallback
