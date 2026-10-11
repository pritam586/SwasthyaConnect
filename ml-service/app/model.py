"""Loading the trained CNN, its approval record and its class order.

The model is used only when ml-service/models (or MODEL_DIR) holds:
  - visual_screening.keras (or another .keras/.h5 file) from training/train_cnn.py
  - metrics.json, whose "labels" give the class order (Keras sorts folders alphabetically)
  - model_validation.json with {"approved": true}, written by a person after reviewing metrics
Otherwise the service reports "not ready" and the API answers 503. It never guesses.
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import threading
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.config import get_settings

logger = logging.getLogger("ml.model")
ANEMIC_LABELS = {"anemic", "anaemic", "anemia"}


@dataclass
class LoadedModel:
    keras_model: Any
    version: str
    output_is_anemia: bool


class ModelNotReady(Exception):
    pass


_lock = threading.Lock()
_loaded: LoadedModel | None = None


def _model_file(model_dir: Path) -> Path | None:
    preferred = [model_dir / "visual_screening.keras", model_dir / "best_model.keras"]
    candidates = preferred + sorted(model_dir.glob("*.keras")) + sorted(model_dir.glob("*.h5"))
    return next((path for path in candidates if path.is_file()), None)


def readiness(model_dir: Path | None = None) -> tuple[bool, str]:
    model_dir = model_dir or get_settings().model_dir
    if _model_file(model_dir) is None:
        return False, "No trained model file is installed."
    try:
        approval = json.loads((model_dir / "model_validation.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False, "The model has no valid approval record (model_validation.json)."
    if not (approval.get("approved") is True or approval.get("status") == "approved"):
        return False, "The model has not been approved for use."
    return True, ""


def _label_order(model_dir: Path) -> list[str]:
    try:
        labels = json.loads((model_dir / "metrics.json").read_text(encoding="utf-8")).get("labels")
        if isinstance(labels, list) and len(labels) == 2:
            return [str(label).lower() for label in labels]
    except (OSError, ValueError):
        pass
    return ["anemic", "non_anemic"]


def download_bundle_if_needed() -> None:
    """Fetch the model bundle at startup when the model directory is empty."""
    settings = get_settings()
    if not settings.model_bundle_url or _model_file(settings.model_dir) is not None:
        return
    logger.info("Downloading model bundle")
    with urllib.request.urlopen(settings.model_bundle_url, timeout=300) as response:  # noqa: S310 - operator-provided URL
        data = response.read()
    if settings.model_bundle_sha256 and hashlib.sha256(data).hexdigest() != settings.model_bundle_sha256:
        raise RuntimeError("Model bundle checksum does not match MODEL_BUNDLE_SHA256; refusing to use it.")
    settings.model_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for member in archive.infolist():
            name = Path(member.filename).name
            if name and not member.is_dir():
                (settings.model_dir / name).write_bytes(archive.read(member))
    logger.info("Model bundle installed")


def get_model() -> LoadedModel:
    global _loaded
    ready, reason = readiness()
    if not ready:
        raise ModelNotReady(reason)
    with _lock:
        if _loaded is None:
            try:
                import tensorflow as tf
            except ImportError as error:
                raise ModelNotReady("TensorFlow is not installed in the ML service.") from error
            model_dir = get_settings().model_dir
            path = _model_file(model_dir)
            keras_model = tf.keras.models.load_model(path, compile=False)
            # A single sigmoid output is the probability of the SECOND class in label order.
            positive = _label_order(model_dir)[1]
            _loaded = LoadedModel(keras_model, f"cnn:{path.name}", positive in ANEMIC_LABELS)
            logger.info("Loaded model %s", path.name)
    return _loaded


def reset_cache() -> None:
    global _loaded
    with _lock:
        _loaded = None
