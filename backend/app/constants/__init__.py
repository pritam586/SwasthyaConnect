"""Closed sets of values shared by models, validators and services."""

from enum import StrEnum


class Role(StrEnum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class DoctorVerification(StrEnum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class AppointmentStatus(StrEnum):
    REQUESTED = "REQUESTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class AppointmentType(StrEnum):
    SCHEDULED = "SCHEDULED"
    INSTANT = "INSTANT"  # "consult a doctor now" request


class MedicationStatus(StrEnum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    STOPPED = "STOPPED"


class ScreeningLabel(StrEnum):
    ANEMIA_LIKELY = "anemia_likely"
    ANEMIA_UNLIKELY = "anemia_unlikely"
    INCONCLUSIVE = "inconclusive"


class Urgency(StrEnum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class CaseStatus(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"


class StockStatus(StrEnum):
    AVAILABLE = "AVAILABLE"
    LOW_STOCK = "LOW_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class FileKind(StrEnum):
    REPORT = "REPORT"
    EYE_IMAGE = "EYE_IMAGE"
    HEATMAP = "HEATMAP"


SCREENING_DISCLAIMER = (
    "Screening support only: this automated result is not a diagnosis. "
    "A licensed clinician must confirm any finding."
)

TRIAGE_DISCLAIMER = (
    "Triage support only: this automated priority helps clinicians order their queue. "
    "A licensed clinician performs the evaluation and decides on treatment."
)

REPORT_FILE_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
IMAGE_FILE_TYPES = {"image/jpeg", "image/png", "image/webp"}
