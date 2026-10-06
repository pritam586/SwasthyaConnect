"""API Gateway and Application Server for SwasthyaConnect.

Composes all modular services:
- Authentication & JWT RBAC (auth_router)
- Patient Records & Encounters (patient_router)
- Doctor Directory & Consultations (doctor_router)
- Pharmacy Locator & Medicines Inventory (pharmacy_router, med_router)
- Medical Reports & OCR Extraction (reports_router)
- Appointment Scheduling (appointment_router)
- Multi-Modal AI Symptom Triage (triage_router)
- Doctor Clinical Workstation (clinical_workflow_router)
- Visual Screening & Grad-CAM (visual_screening_router)
- ABHA / Ayushman Bharat (abha_router)
- Administrative Console (admin_router)
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.admin_service import router as admin_router
from backend.appointment_service import router as appointment_router
from backend.auth_service import router as auth_router
from backend.clinical_workflow.service import router as clinical_workflow_router
from backend.database import init_db, seed_directory_data_if_empty
from backend.patient_service import doctor_router, router as patient_router
from backend.pharmacy_service import med_router, router as pharmacy_router
from backend.reports_service import router as reports_router
from backend.triage.service import router as triage_router
from backend.abha.service import router as abha_router
from ml.inference_service import router as visual_screening_router

# Initialize database schema and baseline data
init_db()
seed_directory_data_if_empty()

# Ensure uploads directories exist
UPLOADS_DIR = Path("uploads")
(UPLOADS_DIR / "reports").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "heatmaps").mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("swasthya.gateway")

app = FastAPI(
    title="SwasthyaConnect API",
    version="2.0.0",
    description="Professional Healthcare Platform API Gateway & Clinical Services.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security Headers & Request Timing Middleware
@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"Unhandled exception during {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred while processing the healthcare request.",
                },
            },
        )

    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    duration_ms = (time.time() - start_time) * 1000
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    return response


# Static Files (Reports & Grad-CAM Heatmaps)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# Health Check
@app.get("/health")
@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "SwasthyaConnect Platform API",
        "version": "2.0.0",
        "database": "sqlite-wal-ready",
    }


# Include Routers
app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(doctor_router)
app.include_router(pharmacy_router)
app.include_router(med_router)
app.include_router(reports_router)
app.include_router(appointment_router)
app.include_router(triage_router)
app.include_router(clinical_workflow_router)
app.include_router(visual_screening_router)
app.include_router(abha_router)
app.include_router(admin_router)
