"""Import every model so Base.metadata is complete for Alembic and table creation."""

from app.models.appointment import Appointment
from app.models.audit_log import AuditLog
from app.models.base import Base, new_id
from app.models.doctor import Doctor, DoctorAvailability
from app.models.health_encounter import HealthEncounter
from app.models.medical_report import MedicalReport
from app.models.medication import Medication
from app.models.notification import Notification
from app.models.patient_profile import PatientProfile
from app.models.pharmacy import Medicine, Pharmacy, PharmacyInventory
from app.models.prescription import Prescription
from app.models.screening_result import ScreeningResult
from app.models.stored_file import StoredFile
from app.models.triage_case import TriageCase
from app.models.user import OtpVerification, RefreshToken, User

__all__ = [
    "Appointment",
    "AuditLog",
    "Base",
    "Doctor",
    "DoctorAvailability",
    "HealthEncounter",
    "MedicalReport",
    "Medication",
    "Medicine",
    "Notification",
    "OtpVerification",
    "PatientProfile",
    "Pharmacy",
    "PharmacyInventory",
    "Prescription",
    "RefreshToken",
    "ScreeningResult",
    "StoredFile",
    "TriageCase",
    "User",
    "new_id",
]
