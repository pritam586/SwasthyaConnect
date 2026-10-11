"""Patient and doctor registration, login, and refresh-token rotation."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.constants import DoctorVerification, Role
from app.models import Doctor, PatientProfile, RefreshToken, User, new_id
from app.schemas.auth import DoctorSignupRequest, PatientSignupRequest, UserOut
from app.services import audit_service, otp_service
from app.utils.clock import as_utc, utcnow
from app.utils.errors import AppError, ConflictError, ForbiddenError, UnauthorizedError
from app.utils.phone import normalize_phone
from app.utils.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    password_needs_rehash,
    verify_password,
)

_INVALID_LOGIN = "Incorrect phone number or password."


def user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    if user.doctor_profile is not None:
        out.doctor_verification_status = user.doctor_profile.verification_status
    return out


def issue_tokens(db: Session, user: User) -> tuple[str, str]:
    raw, token_hash = new_refresh_token()
    now = utcnow()
    db.flush()  # the user may be new in this transaction; insert it before its token
    db.add(
        RefreshToken(
            id=new_id("rt"),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(days=get_settings().refresh_token_expire_days),
            created_at=now,
        )
    )
    return create_access_token(user.id, user.role), raw


def _check_unique(db: Session, phone: str, email: str | None) -> None:
    if db.scalar(select(User.id).where(User.phone == phone)):
        raise ConflictError("An account with this phone number already exists. Please sign in.")
    if email and db.scalar(select(User.id).where(User.email == email.lower())):
        raise ConflictError("An account with this email already exists.")


def _phone_verified(db: Session, phone: str, otp_code: str | None) -> bool:
    """Either a code sent with the signup, or a recent successful /verify-otp for this phone."""
    if otp_code:
        if not otp_service.verify_otp(db, phone, otp_code):
            raise AppError("The verification code is incorrect or has expired.")
        otp_service.consume_verified(db, phone)
        verified = True
    else:
        verified = otp_service.consume_verified(db, phone)
    if get_settings().require_phone_verification and not verified:
        raise AppError("Verify your phone number with the code sent by SMS before registering.")
    return verified


def register_patient(db: Session, req: PatientSignupRequest) -> tuple[User, str, str]:
    _check_unique(db, req.phone, req.email)
    user = User(
        id=new_id("usr"),
        name=req.name.strip(),
        phone=req.phone,
        email=req.email.lower() if req.email else None,
        password_hash=hash_password(req.password),
        role=Role.PATIENT,
        age=req.age,
        gender=req.gender,
        location=req.location.strip(),
        phone_verified=_phone_verified(db, req.phone, req.otp_code),
    )
    user.patient_profile = PatientProfile(id=new_id("prf"))
    db.add(user)
    access, refresh = issue_tokens(db, user)
    audit_service.record(db, user.id, "PATIENT_SIGNUP", "users", user.id)
    db.commit()
    return user, access, refresh


def register_doctor(db: Session, req: DoctorSignupRequest) -> tuple[User, str, str]:
    """Creates a doctor account in PENDING state; an admin must verify the licence."""
    _check_unique(db, req.phone, req.email)
    license_number = req.license_number.strip().upper()
    if db.scalar(select(Doctor.id).where(Doctor.license_number == license_number)):
        raise ConflictError("A doctor with this registration number already exists.")
    user = User(
        id=new_id("usr"),
        name=req.name.strip(),
        phone=req.phone,
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        role=Role.DOCTOR,
        location=req.location.strip(),
        phone_verified=_phone_verified(db, req.phone, req.otp_code),
    )
    user.doctor_profile = Doctor(
        id=new_id("doc"),
        name=user.name,
        specialization=req.specialization.strip(),
        qualification=req.qualification.strip(),
        license_number=license_number,
        experience_years=req.experience_years,
        clinic_name=req.clinic_name,
        location=user.location,
        verification_status=DoctorVerification.PENDING,
    )
    db.add(user)
    access, refresh = issue_tokens(db, user)
    audit_service.record(db, user.id, "DOCTOR_SIGNUP", "users", user.id)
    db.commit()
    return user, access, refresh


def _complete_login(db: Session, user: User | None, password: str, action: str) -> tuple[User, str, str]:
    if user is None or not verify_password(password, user.password_hash):
        raise UnauthorizedError(_INVALID_LOGIN)
    if not user.is_active:
        raise ForbiddenError("This account has been deactivated.")
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    user.last_login_at = utcnow()
    access, refresh = issue_tokens(db, user)
    audit_service.record(db, user.id, action, "users", user.id)
    db.commit()
    return user, access, refresh


def login_patient(db: Session, phone: str, password: str) -> tuple[User, str, str]:
    user = db.scalar(select(User).where(User.phone == phone))
    # Only reveal the account type after the password matches, so this can't probe accounts.
    if user is not None and user.role != Role.PATIENT and verify_password(password, user.password_hash):
        raise ForbiddenError("This is a clinician account. Please use the doctor sign-in page.")
    if user is not None and user.role != Role.PATIENT:
        user = None
    return _complete_login(db, user, password, "PATIENT_LOGIN")


def login_clinician(db: Session, identifier: str, password: str) -> tuple[User, str, str]:
    """Exact match on phone or email (never a partial name match)."""
    identifier = identifier.strip()
    phone = normalize_phone(identifier)
    conditions = [User.email == identifier.lower()]
    if phone:
        conditions.append(User.phone == phone)
    user = db.scalar(select(User).where(or_(*conditions), User.role.in_([Role.DOCTOR, Role.ADMIN])))
    return _complete_login(db, user, password, "CLINICIAN_LOGIN")


def refresh(db: Session, raw_refresh_token: str) -> tuple[str, str]:
    """Rotates the refresh token: the old one is revoked and a new pair is issued."""
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_refresh_token)))
    if record is None or record.revoked:
        raise UnauthorizedError("Your session has ended. Please sign in again.")
    record.revoked = True
    user = db.get(User, record.user_id)
    if as_utc(record.expires_at) < utcnow() or user is None or not user.is_active:
        db.commit()
        raise UnauthorizedError("Your session has ended. Please sign in again.")
    access, new_refresh = issue_tokens(db, user)
    db.commit()
    return access, new_refresh


def logout(db: Session, raw_refresh_token: str | None) -> None:
    if not raw_refresh_token:
        return
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_refresh_token)))
    if record is not None:
        record.revoked = True
        db.commit()
