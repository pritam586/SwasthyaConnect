"""Phone OTP via Twilio Verify, or a local development provider.

The development provider stores a hashed code in the database and returns it in the API
response so the flow can be tested without SMS. Production settings refuse to enable it.
"""

from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models import OtpVerification
from app.utils.clock import as_utc, utcnow
from app.utils.errors import ServiceUnavailableError
from app.utils.phone import to_e164
from app.utils.security import hash_token

logger = logging.getLogger("swasthya.otp")

OTP_TTL = timedelta(minutes=5)
# How long a successful verification can be used to complete signup.
VERIFIED_TTL = timedelta(minutes=15)
MAX_ATTEMPTS = 5


def send_otp(db: Session, phone: str) -> tuple[str, str | None]:
    """Returns (provider name, development code or None)."""
    settings = get_settings()
    if settings.twilio_configured:
        _twilio_client().verify.v2.services(settings.twilio_verify_service_sid).verifications.create(
            to=to_e164(phone), channel="sms"
        )
        return "twilio", None
    if settings.enable_dev_otp:
        code = f"{secrets.randbelow(900000) + 100000}"
        record = db.get(OtpVerification, phone) or OtpVerification(phone=phone)
        record.code_hash = hash_token(code)
        record.expires_at = utcnow() + OTP_TTL
        record.verified = False
        record.attempts = 0
        db.merge(record)
        db.commit()
        return "development", code
    raise ServiceUnavailableError("SMS verification is not configured on this server.")


def verify_otp(db: Session, phone: str, code: str) -> bool:
    settings = get_settings()
    if settings.twilio_configured:
        try:
            check = _twilio_client().verify.v2.services(settings.twilio_verify_service_sid).verification_checks.create(
                to=to_e164(phone), code=code
            )
        except Exception:  # the Twilio SDK raises its own exception types
            logger.exception("Twilio verification check failed")
            return False
        if check.status != "approved":
            return False
        _remember_verified(db, phone)
        return True
    if not settings.enable_dev_otp:
        return False
    record = db.get(OtpVerification, phone)
    if record is None or record.verified or record.attempts >= MAX_ATTEMPTS:
        return False
    if utcnow() > as_utc(record.expires_at):
        return False
    if secrets.compare_digest(record.code_hash, hash_token(code)):
        _remember_verified(db, phone)
        return True
    record.attempts += 1
    db.commit()
    return False


def _remember_verified(db: Session, phone: str) -> None:
    record = db.get(OtpVerification, phone) or OtpVerification(phone=phone, code_hash="", attempts=0)
    record.code_hash = ""  # a verified code cannot be checked again
    record.verified = True
    record.expires_at = utcnow() + VERIFIED_TTL
    db.merge(record)
    db.commit()


def consume_verified(db: Session, phone: str) -> bool:
    """True once if this phone completed OTP verification in the last VERIFIED_TTL."""
    record = db.get(OtpVerification, phone)
    if record is None or not record.verified or utcnow() > as_utc(record.expires_at):
        return False
    db.delete(record)
    return True


def _twilio_client():
    try:
        from twilio.rest import Client
    except ImportError as error:  # pragma: no cover - only when Twilio is configured without the package
        raise ServiceUnavailableError("Twilio is configured but the 'twilio' package is not installed.") from error
    settings = get_settings()
    return Client(settings.twilio_account_sid, settings.twilio_auth_token)
