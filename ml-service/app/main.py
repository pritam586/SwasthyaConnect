"""SwasthyaConnect ML inference service (internal; called only by the backend API).

POST /v1/analyze  multipart field "image" -> quality gate, CNN prediction, Grad-CAM heatmap
GET  /health      {"status": "ok", "model_ready": bool}

Screening support only: the response is never a diagnosis.
"""

from __future__ import annotations

import base64
import io
import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app import inference, model, quality
from app.config import get_settings

logging.basicConfig(level="INFO", format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ml.api")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if settings.environment == "production" and not settings.internal_token:
        raise RuntimeError("ML_SERVICE_TOKEN must be set in production.")
    try:
        model.download_bundle_if_needed()
    except Exception:  # a failed download leaves the service up but "not ready"
        logger.exception("Model bundle download failed")
    ready, reason = model.readiness()
    logger.info("Model ready: %s %s", ready, reason)
    yield


app = FastAPI(title="SwasthyaConnect ML service", version="1.0.0", lifespan=lifespan, docs_url=None, redoc_url=None)


def _check_token(token: str | None) -> None:
    expected = get_settings().internal_token
    if expected and not (token and secrets.compare_digest(token, expected)):
        raise HTTPException(status_code=401, detail="Unauthorized.")


@app.get("/health")
def health() -> dict:
    ready, _reason = model.readiness()
    return {"status": "ok", "model_ready": ready}


@app.post("/v1/analyze")
async def analyze(image: UploadFile = File(...), x_internal_token: str | None = Header(default=None)) -> dict:
    _check_token(x_internal_token)
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG or WebP image.")
    content = await image.read()
    if len(content) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="The image is too large.")
    try:
        picture = Image.open(io.BytesIO(content))
        picture.load()
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="The file is not a readable image.") from error

    passed, reason = quality.check(picture)
    if not passed:
        return {"quality_passed": False, "quality_reason": reason, "screening_label": "inconclusive",
                "confidence": 0.0, "triage_level": "YELLOW", "explanation": reason, "model_version": None,
                "heatmap_png_base64": None}

    try:
        loaded = model.get_model()
    except model.ModelNotReady as error:
        raise HTTPException(status_code=503, detail=f"Visual screening is not available: {error}") from error

    batch = inference.preprocess(picture)
    prediction = inference.predict(loaded, batch)
    cam = inference.grad_cam(loaded, batch)
    heatmap = base64.b64encode(inference.heatmap_png(picture, cam)).decode("ascii") if cam is not None else None
    return {
        "quality_passed": True,
        "quality_reason": "",
        "screening_label": prediction.screening_label,
        "confidence": prediction.confidence,
        "triage_level": prediction.triage_level,
        "explanation": prediction.explanation,
        "model_version": loaded.version,
        "heatmap_png_base64": heatmap,
    }
