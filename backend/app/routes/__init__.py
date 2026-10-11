"""Route table: mounts each controller under its /api/v1 prefix."""

from __future__ import annotations

from fastapi import APIRouter

from app.controllers import (
    abha_controller,
    admin_controller,
    appointment_controller,
    auth_controller,
    clinical_controller,
    doctor_controller,
    file_controller,
    patient_controller,
    pharmacy_controller,
    report_controller,
    screening_controller,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_controller.router, prefix="/auth")
api_router.include_router(patient_controller.router, prefix="/patients/me")
api_router.include_router(doctor_controller.router, prefix="/doctors")
api_router.include_router(appointment_controller.router, prefix="/appointments")
api_router.include_router(pharmacy_controller.pharmacy_router, prefix="/pharmacies")
api_router.include_router(pharmacy_controller.medicine_router, prefix="/medicines")
api_router.include_router(report_controller.router, prefix="/reports")
api_router.include_router(screening_controller.screening_router, prefix="/screenings")
api_router.include_router(screening_controller.triage_router, prefix="/triage")
api_router.include_router(clinical_controller.router, prefix="/clinical")
api_router.include_router(abha_controller.router, prefix="/abha")
api_router.include_router(file_controller.router, prefix="/files")
api_router.include_router(admin_controller.router, prefix="/admin")
