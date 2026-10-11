"""Visual Anaemia Screening & Conjunctival Pallor Inference Service for SwasthyaConnect.

Implements:
1. Strict Technical Quality Gate (resolution, exposure, contrast, blur).
2. CNN inference with the model trained by ml/train_cnn.py (MobileNetV3Small).
3. Colour-based pallor heatmap for the clinician (not yet a true Grad-CAM).
4. Real database persistence into `ai_analyses` table when called with patient auth.
5. Strict AI Safety disclaimers per healthcare regulations.
"""

from __future__ import annotations

import io
import json
import logging
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, FastAPI, File, Header, HTTPException, UploadFile, status
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageStat

from backend.auth_service import decode_access_token
from backend.database import get_db_connection

logger = logging.getLogger("swasthya.visual_screening")
router = APIRouter(prefix="/api/v1/visual-screening", tags=["visual-screening"])
app = FastAPI(title="SwasthyaConnect visual screening", version="1.0.0")

HEATMAP_DIR = Path(__file__).resolve().parent.parent / "uploads" / "heatmaps"
HEATMAP_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR = Path(__file__).resolve().parent / "models"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

DISCLAIMER = (
    "AI Screening Support: This non-invasive visual screening is an automated assistive tool "
    "and does NOT constitute a definitive clinical diagnosis. A licensed physician must confirm all findings."
)


def _model_readiness_status() -> tuple[bool, str]:
    """Return whether the visual-screening model and validation record are available for use."""
    if not MODEL_DIR.exists():
        return False, "Visual screening is unavailable: model directory is missing."

    validation_path = MODEL_DIR / "model_validation.json"
    if not validation_path.exists():
        return False, "Visual screening is unavailable: model_validation.json is missing."

    try:
        payload = json.loads(validation_path.read_text(encoding="utf-8"))
    except (OSError, TypeError, ValueError):
        return False, "Visual screening is unavailable: model_validation.json is invalid or unreadable."

    approved = bool(payload.get("approved") or payload.get("status") == "approved" or payload.get("is_valid"))
    if not approved:
        return False, "Visual screening is unavailable: model approval record has not been validated."

    model_files = [
        *MODEL_DIR.glob("*.keras"),
        *MODEL_DIR.glob("*.h5"),
    ]
    if not model_files:
        return False, "Visual screening is unavailable: no trained model weights were found."

    return True, ""


def quality_gate(image: Image.Image) -> tuple[bool, str]:
    """Inspect technical validity of captured eye image before running inference."""
    rgb = image.convert("RGB")
    w, h = rgb.size
    if min(w, h) < 128:
        return False, "Image resolution is too low. Move closer to the camera and retake the photo."

    # Brightness check
    gray = image.convert("L")
    stat = ImageStat.Stat(gray)
    brightness = stat.mean[0]
    if brightness < 35:
        return False, "Lighting is too dark. Capture in a brightly lit environment without heavy shadows."
    if brightness > 225:
        return False, "Lighting is overexposed with glare. Reduce direct harsh flash and retake the photo."

    # Contrast check
    std_dev = stat.stddev[0]
    if std_dev < 15:
        return False, "Image has insufficient contrast or is heavily blurred. Please focus and retake."

    return True, ""


def generate_pallor_heatmap(image: Image.Image) -> str:
    """Generate visual heatmap overlay highlighting the conjunctival pallor / vascular bed region."""
    rgb = image.convert("RGB").resize((320, 240))
    arr = np.array(rgb, dtype=np.float32)

    # Compute erythema / pallor intensity: R / (G + B + 1e-5)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    erythema = (r + 1.0) / (g + b + 2.0)

    # Normalize erythema map to [0, 255]
    norm = ((erythema - erythema.min()) / (erythema.max() - erythema.min() + 1e-5) * 255).astype(np.uint8)

    # Create thermal colormap overlay (Blue -> Green -> Yellow -> Red)
    heatmap_img = Image.fromarray(norm, mode="L")
    colored_heatmap = Image.new("RGB", heatmap_img.size)
    heat_draw = colored_heatmap.load()
    raw_pixels = heatmap_img.load()

    for y in range(heatmap_img.size[1]):
        for x in range(heatmap_img.size[0]):
            val = raw_pixels[x, y]
            # Thermal gradient: low = blue/cyan, mid = yellow, high = red
            if val < 85:
                cr = int(val * 2)
                cg = int(val * 3)
                cb = 220
            elif val < 170:
                rel = val - 85
                cr = 200 + int(rel * 0.6)
                cg = 230 - int(rel * 0.5)
                cb = int(80 - rel * 0.8)
            else:
                rel = val - 170
                cr = 255
                cg = max(0, int(180 - rel * 2.0))
                cb = 30
            heat_draw[x, y] = (cr, cg, cb)

    # Blend 60% original + 40% thermal heatmap
    blended = Image.blend(rgb, colored_heatmap, alpha=0.45)

    filename = f"heatmap_{secrets.token_hex(6)}.jpg"
    out_path = HEATMAP_DIR / filename
    blended.save(out_path, format="JPEG", quality=85)
    return f"/uploads/heatmaps/{filename}"


def _load_label_order() -> list[str]:
    """Class order recorded by train_cnn.py; Keras sorts class folders alphabetically."""
    metrics_path = MODEL_DIR / "metrics.json"
    try:
        labels = json.loads(metrics_path.read_text(encoding="utf-8")).get("labels")
        if isinstance(labels, list) and len(labels) == 2:
            return [str(label) for label in labels]
    except (OSError, ValueError):
        pass
    return ["anemic", "non_anemic"]


@lru_cache(maxsize=1)
def _load_model() -> tuple[Any, str, bool]:
    """Load the trained CNN once. Returns (model, version, output_is_anemia_probability)."""
    try:
        import tensorflow as tf
    except ImportError as error:
        raise RuntimeError("TensorFlow is not installed. Install ml/requirements-ml.txt.") from error

    candidates = [MODEL_DIR / "visual_screening.keras", MODEL_DIR / "best_model.keras"]
    candidates += sorted(MODEL_DIR.glob("*.keras")) + sorted(MODEL_DIR.glob("*.h5"))
    model_path = next(path for path in candidates if path.exists())
    model = tf.keras.models.load_model(model_path, compile=False)

    # A sigmoid output is the probability of the SECOND class in label order.
    positive_class = _load_label_order()[1].lower()
    output_is_anemia = positive_class in {"anemic", "anaemic", "anemia"}
    return model, f"cnn:{model_path.name}", output_is_anemia


def compute_anaemia_screening(image: Image.Image) -> tuple[str, float, str, str, str, str]:
    """Run the trained CNN on a quality-approved conjunctiva image."""
    model, model_version, output_is_anemia = _load_model()
    batch = np.asarray(image.convert("RGB").resize((224, 224)), dtype=np.float32)[np.newaxis, ...]
    raw = float(np.asarray(model.predict(batch, verbose=0)).reshape(-1)[0])
    p_anemia = raw if output_is_anemia else 1.0 - raw

    heatmap_url = generate_pallor_heatmap(image)

    if 0.40 <= p_anemia < 0.60:
        screening_label = "inconclusive"
        confidence = round(max(p_anemia, 1.0 - p_anemia) * 100, 1)
        triage_level = "YELLOW"
        explanation = (
            f"The model could not separate the classes clearly (anaemia probability {p_anemia:.2f}). "
            "Retake the photo or request a clinician-assisted capture."
        )
    elif p_anemia >= 0.60:
        screening_label = "anemia_likely"
        confidence = round(p_anemia * 100, 1)
        triage_level = "RED" if p_anemia >= 0.85 else "YELLOW"
        explanation = f"The model flags conjunctival pallor (anaemia probability {p_anemia:.2f})."
    else:
        screening_label = "anemia_unlikely"
        confidence = round((1.0 - p_anemia) * 100, 1)
        triage_level = "GREEN"
        explanation = f"The model does not flag conjunctival pallor (anaemia probability {p_anemia:.2f})."

    return screening_label, confidence, triage_level, explanation, heatmap_url, model_version


@router.post("/analyze")
@app.post("/api/v1/visual-screening/analyze")
async def analyze_visual_screening(
    image: UploadFile = File(...),
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    """Perform non-invasive conjunctiva image screening with quality gate & persistence."""
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a JPEG, PNG, or WebP eye image.",
        )

    ready, message = _model_readiness_status()
    if not ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=message,
        )

    contents = await image.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="The image is too large. Maximum size is 10 MB.",
        )

    try:
        pil_img = Image.open(io.BytesIO(contents))
        pil_img.load()
    except Exception as err:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from err

    # 1. Quality Gate Check
    passed, reason = quality_gate(pil_img)
    if not passed:
        return {
            "screening_label": "inconclusive",
            "confidence": 0.0,
            "triage_level": "YELLOW",
            "quality_passed": False,
            "quality_reason": reason,
            "grad_cam_image_url": None,
            "explanation": f"Quality check failed: {reason}",
            "disclaimer": DISCLAIMER,
        }

    # 2. Screening Inference
    try:
        label, confidence, triage_level, explanation, heatmap_url, model_version = compute_anaemia_screening(pil_img)
    except RuntimeError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err)) from err

    # 3. Check for authenticated patient and persist in database
    analysis_id = f"ai-{secrets.token_hex(4)}"
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ")[1]
            claims = decode_access_token(token)
            patient_id = claims.get("sub")
            if patient_id:
                conn = get_db_connection()
                conn.execute(
                    """
                    INSERT INTO ai_analyses (
                        id, patient_id, model_version, prediction, confidence,
                        triage_level, quality_passed, grad_cam_url, explanation, disclaimer
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                    """,
                    (
                        analysis_id,
                        patient_id,
                        model_version,
                        label,
                        confidence / 100.0,
                        triage_level,
                        heatmap_url,
                        explanation,
                        DISCLAIMER,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO notifications (id, user_id, title, message, type)
                    VALUES (?, ?, ?, ?, 'AI_ANALYSIS')
                    """,
                    (
                        f"notif-{secrets.token_hex(4)}",
                        patient_id,
                        f"AI Screening Complete: {label.replace('_', ' ').capitalize()}",
                        f"Confidence: {confidence:.1f}%. Triage priority: {triage_level}.",
                    ),
                )
                conn.commit()
                conn.close()
        except Exception:
            # The screening result is still returned, but the failure must be visible in logs.
            logger.exception("Could not save visual screening result %s", analysis_id)
            analysis_id = None

    return {
        "analysis_id": analysis_id,
        "screening_label": label,
        "confidence": confidence,
        "triage_level": triage_level,
        "quality_passed": True,
        "quality_reason": "",
        "grad_cam_image_url": heatmap_url,
        "explanation": explanation,
        "disclaimer": DISCLAIMER,
    }
