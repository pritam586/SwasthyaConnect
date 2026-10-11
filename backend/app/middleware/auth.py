"""Authentication and role checks, enforced on the server for every protected route."""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.constants import DoctorVerification, Role
from app.models import Doctor, User
from app.utils.errors import ForbiddenError, UnauthorizedError
from app.utils.security import TokenError, decode_access_token


def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Please sign in to continue.")
    try:
        claims = decode_access_token(authorization.split(" ", 1)[1].strip())
    except TokenError as error:
        raise UnauthorizedError(error.message) from error
    user = db.get(User, claims["sub"])
    if user is None:
        raise UnauthorizedError("Your session is no longer valid. Please sign in again.")
    if not user.is_active:
        raise ForbiddenError("This account has been deactivated.")
    return user


def get_optional_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User | None:
    if not authorization:
        return None
    return get_current_user(authorization, db)


def require_roles(*roles: Role) -> Callable[[User], User]:
    allowed = {role.value for role in roles}

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise ForbiddenError("You do not have access to this resource.")
        return user

    return checker


require_patient = require_roles(Role.PATIENT)
require_admin = require_roles(Role.ADMIN)


def require_doctor_account(user: User = Depends(require_roles(Role.DOCTOR))) -> Doctor:
    """Any doctor account, including one still awaiting verification (for its own profile)."""
    if user.doctor_profile is None:
        raise ForbiddenError("No doctor profile is linked to this account.")
    return user.doctor_profile


def require_verified_doctor(doctor: Doctor = Depends(require_doctor_account)) -> Doctor:
    """Clinical workflows (patient data, prescriptions) need an admin-verified licence."""
    if doctor.verification_status != DoctorVerification.VERIFIED:
        raise ForbiddenError("Your doctor account is awaiting verification by an administrator.")
    return doctor
