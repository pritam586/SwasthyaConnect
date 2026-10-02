"""API boundary for Sairaj's visual-screening CNN.

It refuses to provide a result until a trained research model exists and the
uploaded image passes basic technical quality checks. It is not a diagnosis API.
"""

from __future__ import annotations

import io
import json
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageStat


MODEL_PATH = Path(os.getenv("VISUAL_SCREENING_MODEL", "models/visual_screening.keras"))
VALIDATION_PATH = Path(os.getenv("VISUAL_SCREENING_VALIDATION", "models/model_validation.json"))
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
app = FastAPI(title="SwasthyaConnect visual screening", version="0.1.0")
DISCLAIMER = "Screening support only. A licensed clinician must confirm any concern with appropriate clinical assessment."


def quality_gate(image: Image.Image) -> tuple[bool, str]:
    image = image.convert("RGB")
    if min(image.size) < 128:
        return False, "The image is too small. Move closer and retake the photo."
    brightness = sum(ImageStat.Stat(image.convert("L")).mean)
    if brightness < 35:
        return False, "The image is too dark. Use brighter, even lighting and retake the photo."
    if brightness > 225:
        return False, "The image is overexposed. Reduce glare and retake the photo."
    return True, ""


def model_is_validated() -> tuple[bool, str]:
    if not MODEL_PATH.is_file():
        return False, "A trained screening model has not been deployed."
    if not VALIDATION_PATH.is_file():
        return False, "The deployed model has no validation approval record."
    try:
        validation = json.loads(VALIDATION_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False, "The model validation record is unreadable."
    if validation.get("status") != "approved" or validation.get("intended_use") != "research_screening":
        return False, "The deployed model is not approved for research screening use."
    if validation.get("model_filename") != MODEL_PATH.name:
        return False, "The validation record does not match the deployed model."
    return True, ""


@app.post("/api/v1/visual-screening/analyze")
async def analyze(image: UploadFile = File(...)) -> dict[str, object]:
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")
    contents = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The image is too large. Upload a file smaller than 10 MB.")
    try:
        uploaded = Image.open(io.BytesIO(contents))
        uploaded.load()
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image.") from error

    quality_passed, quality_reason = quality_gate(uploaded)
    if not quality_passed:
        return {
            "screening_label": "inconclusive",
            "confidence": 0.0,
            "quality_passed": False,
            "quality_reason": quality_reason,
            "disclaimer": DISCLAIMER,
        }
    validated, reason = model_is_validated()
    if not validated:
        raise HTTPException(status_code=503, detail=reason)

    # Model loading and Grad-CAM generation belong here after model validation.
    # Returning a placeholder prediction would be unsafe, so this API fails closed.
    raise HTTPException(status_code=503, detail="Model inference is not enabled until validation review is complete.")
