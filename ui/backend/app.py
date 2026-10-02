"""Single API gateway that composes all four SwasthyaConnect modules."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.abha.service import app as abha_app
from backend.clinical_workflow.service import app as clinical_workflow_app
from backend.triage.service import app as triage_app
from ml.inference_service import app as visual_screening_app


app = FastAPI(
    title="SwasthyaConnect API",
    version="0.1.0",
    description="Composed API gateway for visual screening, symptom triage, ABHA, and clinician workflow modules.",
)

# The Vite proxy is the normal development path. CORS permits a separately
# hosted frontend only when an explicit comma-separated allowlist is supplied.
allowed_origins = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "swasthyaconnect-api"}


for module_app in (visual_screening_app, triage_app, abha_app, clinical_workflow_app):
    # Each module owns only versioned `/api` routes. Copying these routes keeps
    # a single ASGI app and prevents a catch-all mounted sub-app from hiding
    # routes registered by the other modules.
    app.router.routes.extend(route for route in module_app.routes if getattr(route, "path", "").startswith("/api/"))
