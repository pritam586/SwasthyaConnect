"""/api/v1/auth: registration, login and session management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import auth_rate_limit
from app.models import User
from app.schemas.auth import (
    AuthResponse,
    DoctorLoginRequest,
    DoctorSignupRequest,
    LogoutRequest,
    OtpSentResponse,
    PatientLoginRequest,
    PatientSignupRequest,
    RefreshRequest,
    SendOtpRequest,
    TokenPair,
    UserOut,
    VerifyOtpRequest,
)
from app.schemas.common import Message
from app.services import auth_service, otp_service
from app.utils.errors import AppError

router = APIRouter(tags=["auth"])
limited = [Depends(auth_rate_limit)]


def _auth_response(result: tuple[User, str, str]) -> AuthResponse:
    user, access, refresh = result
    return AuthResponse(access_token=access, refresh_token=refresh, user=auth_service.user_out(user))


@router.post("/send-otp", response_model=OtpSentResponse, dependencies=limited)
def send_otp(req: SendOtpRequest, db: Session = Depends(get_db)) -> OtpSentResponse:
    provider, dev_code = otp_service.send_otp(db, req.phone)
    return OtpSentResponse(message="Verification code sent.", provider=provider, dev_code=dev_code)


@router.post("/verify-otp", response_model=Message, dependencies=limited)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)) -> Message:
    if not otp_service.verify_otp(db, req.phone, req.otp_code):
        raise AppError("The verification code is incorrect or has expired.")
    return Message(message="Phone number verified.")


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, dependencies=limited)
def patient_signup(req: PatientSignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return _auth_response(auth_service.register_patient(db, req))


@router.post("/doctor/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, dependencies=limited)
def doctor_signup(req: DoctorSignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return _auth_response(auth_service.register_doctor(db, req))


@router.post("/login", response_model=AuthResponse, dependencies=limited)
def patient_login(req: PatientLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return _auth_response(auth_service.login_patient(db, req.phone, req.password))


@router.post("/doctor/login", response_model=AuthResponse, dependencies=limited)
def clinician_login(req: DoctorLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return _auth_response(auth_service.login_clinician(db, req.identifier, req.password))


@router.post("/refresh", response_model=TokenPair, dependencies=limited)
def refresh(req: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    access, new_refresh = auth_service.refresh(db, req.refresh_token)
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout", response_model=Message)
def logout(req: LogoutRequest, db: Session = Depends(get_db)) -> Message:
    auth_service.logout(db, req.refresh_token)
    return Message(message="Signed out.")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return auth_service.user_out(user)
