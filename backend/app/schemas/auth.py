"""Registration, login and session payloads."""

from __future__ import annotations

from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import ApiModel, OrmModel
from app.utils.phone import normalize_phone

Gender = Literal["Male", "Female", "Other"]


class PhoneField(ApiModel):
    phone: str = Field(min_length=10, max_length=16)

    @field_validator("phone")
    @classmethod
    def _valid_phone(cls, value: str) -> str:
        normalized = normalize_phone(value)
        if normalized is None:
            raise ValueError("enter a valid 10-digit Indian mobile number")
        return normalized


class SendOtpRequest(PhoneField):
    pass


class VerifyOtpRequest(PhoneField):
    otp_code: str = Field(pattern=r"^\d{4,8}$")


class PatientSignupRequest(PhoneField):
    name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    age: int = Field(ge=1, le=120)
    gender: Gender
    location: str = Field(min_length=2, max_length=200)
    email: EmailStr | None = None
    otp_code: str | None = Field(default=None, pattern=r"^\d{4,8}$")


class DoctorSignupRequest(PhoneField):
    name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    email: EmailStr
    specialization: str = Field(min_length=2, max_length=120)
    qualification: str = Field(min_length=2, max_length=120)
    license_number: str = Field(min_length=4, max_length=50)
    experience_years: int = Field(default=0, ge=0, le=70)
    clinic_name: str | None = Field(default=None, max_length=150)
    location: str = Field(min_length=2, max_length=200)
    otp_code: str | None = Field(default=None, pattern=r"^\d{4,8}$")


class PatientLoginRequest(PhoneField):
    password: str = Field(min_length=1, max_length=128)


class DoctorLoginRequest(ApiModel):
    """Doctors and admins sign in with their phone number or email."""

    identifier: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(ApiModel):
    refresh_token: str = Field(min_length=20, max_length=200)


class LogoutRequest(ApiModel):
    refresh_token: str | None = Field(default=None, max_length=200)


class UserOut(OrmModel):
    id: str
    name: str
    phone: str
    email: str | None
    role: str
    age: int | None
    gender: str | None
    location: str | None
    abha_id: str | None
    phone_verified: bool
    doctor_verification_status: str | None = None


class AuthResponse(ApiModel):
    access_token: str
    refresh_token: str
    user: UserOut


class TokenPair(ApiModel):
    access_token: str
    refresh_token: str


class OtpSentResponse(ApiModel):
    message: str
    provider: str
    # Only returned by the development OTP provider, never in production.
    dev_code: str | None = None
