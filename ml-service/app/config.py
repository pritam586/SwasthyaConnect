"""ML service settings from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    model_dir: Path
    # Optional: a .zip with visual_screening.keras, metrics.json and model_validation.json,
    # downloaded at startup when model_dir holds no model (e.g. on Render, whose disk is not persistent).
    model_bundle_url: str
    model_bundle_sha256: str
    # Shared secret the backend sends as X-Internal-Token. Required in production.
    internal_token: str
    max_upload_bytes: int
    environment: str


def get_settings() -> Settings:
    return Settings(
        model_dir=Path(os.getenv("MODEL_DIR", str(SERVICE_DIR / "models"))),
        model_bundle_url=os.getenv("MODEL_BUNDLE_URL", "").strip(),
        model_bundle_sha256=os.getenv("MODEL_BUNDLE_SHA256", "").strip().lower(),
        internal_token=os.getenv("ML_SERVICE_TOKEN", "").strip(),
        max_upload_bytes=int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024,
        environment=os.getenv("ENVIRONMENT", "development").strip().lower(),
    )
