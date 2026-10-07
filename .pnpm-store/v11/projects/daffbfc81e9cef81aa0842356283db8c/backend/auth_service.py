"""Authentication and User Management Service for SwasthyaConnect.

Implements:
- Dual JWT architecture: short-lived Access Token + long-lived Refresh Token
- PBKDF2-HMAC-SHA256 salted password hashing
- Role-Based Access Control (PATIENT, DOCTOR, ADMIN)
- Phone OTP verification abstraction
- Token revocation and refresh token rotation
- Audit logging for security events
"""

from __future__ import annotations

import hashlib
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Literal

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from .crypto_utils import hash_password, is_hash_legacy, verify_password
from .database import get_db_connection
from .phone_verification import send_phone_otp, verify_phone_otp

JWT_SECRET = os.getenv("JWT_SECRET", "swasthya-connect-jwt-secret-key-2026-secure")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ─── JWT & Token Management ──────────────────────────────────────────────────

def create_access_token(user_id: str, role: str, name: str) -> str:
    """Generate short-lived JWT access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role.upper(),
        "name": name,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Generate cryptographically secure refresh token and store hash in database."""
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = time.time() + (REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked)
        VALUES (?, ?, ?, ?, 0)
        """,
        (f"rt-{secrets.token_hex(6)}", user_id, token_hash, expires_at),
    )
    conn.commit()
    conn.close()

    return raw_token


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate JWT access token claims."""
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if claims.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type.",
            )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please refresh your token or log in again.",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from e


def log_audit_event(
    user_id: str | None, action: str, resource_type: str, resource_id: str | None = None, details: str | None = None
) -> None:
    try:
        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (f"aud-{secrets.token_hex(6)}", user_id, action, resource_type, resource_id, details),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


# ─── Pydantic Request / Response Schemas ─────────────────────────────────────

class CheckUserRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)


class SendOtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)


class VerifyOtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)
    otp_code: str = Field(min_length=4, max_length=8)


class SignupRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)
    name: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=1, le=120)
    gender: Literal["Male", "Female", "Other"]
    location: str = Field(default="Rural Healthcare Center")
    password: str = Field(min_length=4)
    email: str | None = None
    abha_id: str | None = None
    pmjay_eligible: bool = False
    otp_code: str | None = None


class LoginRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    password: str = Field(min_length=1)


class DoctorLoginRequest(BaseModel):
    phone_or_email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class AuthResponse(BaseModel):
    token: str
    refresh_token: str
    user: dict[str, Any]
    message: str


# ─── Auth Endpoints ──────────────────────────────────────────────────────────

@router.post("/check-user")
async def check_user(req: CheckUserRequest) -> dict[str, Any]:
    clean_phone = "".join(filter(str.isdigit, req.phone))[-10:]
    conn = get_db_connection()
    user = conn.execute("SELECT id, name, role FROM users WHERE phone LIKE ?", (f"%{clean_phone}",)).fetchone()
    conn.close()
    if user:
        return {"exists": True, "user_id": user["id"], "name": user["name"], "role": user["role"]}
    return {"exists": False}


@router.post("/send-otp")
async def send_otp_endpoint(req: SendOtpRequest) -> dict[str, Any]:
    return send_phone_otp(req.phone)


@router.post("/verify-otp")
async def verify_otp_endpoint(req: VerifyOtpRequest) -> dict[str, Any]:
    valid = verify_phone_otp(req.phone, req.otp_code)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    # Mark user's phone verified in database if account exists
    clean_phone = "".join(filter(str.isdigit, req.phone))[-10:]
    conn = get_db_connection()
    conn.execute("UPDATE users SET phone_verified = 1 WHERE phone LIKE ?", (f"%{clean_phone}",))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Phone number verified successfully."}


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest) -> AuthResponse:
    clean_phone = "".join(filter(str.isdigit, req.phone))[-10:]
    if len(clean_phone) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")

    conn = get_db_connection()
    existing = conn.execute("SELECT id FROM users WHERE phone LIKE ?", (f"%{clean_phone}",)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this phone number already exists. Please log in.",
        )

    # If OTP code provided, verify it
    phone_verified = False
    if req.otp_code:
        phone_verified = verify_phone_otp(req.phone, req.otp_code)

    user_id = f"usr-{secrets.token_hex(4)}"
    pwd_hash = hash_password(req.password)

    conn.execute(
        """
        INSERT INTO users (id, phone, email, name, age, gender, location, password_hash, abha_id, pmjay_eligible, role, phone_verified, profile_completed, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PATIENT', ?, 1, 1)
        """,
        (
            user_id,
            clean_phone,
            req.email,
            req.name,
            req.age,
            req.gender,
            req.location,
            pwd_hash,
            req.abha_id,
            1 if req.pmjay_eligible else 0,
            1 if phone_verified else 0,
        ),
    )
    conn.execute(
        """
        INSERT OR IGNORE INTO patient_profiles (id, user_id, gender, location, abha_id, pmjay_eligible)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"prof-{secrets.token_hex(4)}",
            user_id,
            req.gender,
            req.location,
            req.abha_id,
            1 if req.pmjay_eligible else 0,
        ),
    )
    conn.commit()
    conn.close()

    log_audit_event(user_id, "USER_SIGNUP", "users", user_id, f"Registered role PATIENT: {req.name}")

    access_token = create_access_token(user_id, "PATIENT", req.name)
    refresh_token = create_refresh_token(user_id)

    user_data = {
        "id": user_id,
        "phone": clean_phone,
        "email": req.email,
        "name": req.name,
        "age": req.age,
        "gender": req.gender,
        "location": req.location,
        "abha_id": req.abha_id,
        "pmjay_eligible": req.pmjay_eligible,
        "role": "PATIENT",
        "phone_verified": phone_verified,
        "profile_completed": True,
    }
    return AuthResponse(
        token=access_token,
        refresh_token=refresh_token,
        user=user_data,
        message="Registration successful.",
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest) -> AuthResponse:
    clean_phone = "".join(filter(str.isdigit, req.phone))[-10:]
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE phone LIKE ?", (f"%{clean_phone}",)).fetchone()

    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with this mobile number. Please register first.",
        )

    if not user["is_active"]:
        conn.close()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    if not verify_password(req.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password.")

    # Seamless security upgrade to PBKDF2 if previously stored in legacy hash
    if is_hash_legacy(user["password_hash"]):
        new_hash = hash_password(req.password)
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))

    # Update last login timestamp
    conn.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    log_audit_event(user["id"], "USER_LOGIN", "users", user["id"], "Successful patient login")

    access_token = create_access_token(user["id"], user["role"], user["name"])
    refresh_token = create_refresh_token(user["id"])

    user_data = {
        "id": user["id"],
        "phone": user["phone"],
        "email": user["email"],
        "name": user["name"],
        "age": user["age"],
        "gender": user["gender"],
        "location": user["location"],
        "abha_id": user["abha_id"],
        "pmjay_eligible": bool(user["pmjay_eligible"]),
        "role": user["role"],
        "phone_verified": bool(user["phone_verified"]),
        "profile_completed": bool(user["profile_completed"]),
    }
    return AuthResponse(
        token=access_token,
        refresh_token=refresh_token,
        user=user_data,
        message="Login successful.",
    )


@router.post("/doctor-login", response_model=AuthResponse)
async def doctor_login(req: DoctorLoginRequest) -> AuthResponse:
    conn = get_db_connection()
    user = conn.execute(
        """
        SELECT * FROM users 
        WHERE (UPPER(role) = 'DOCTOR' OR UPPER(role) = 'ADMIN') 
          AND (phone = ? OR email = ? OR name LIKE ?)
        """,
        (req.phone_or_email, req.phone_or_email, f"%{req.phone_or_email}%"),
    ).fetchone()

    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No clinician or administrative account found with these credentials.",
        )

    if not user["is_active"]:
        conn.close()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clinician account is inactive.")

    if not verify_password(req.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid clinician password.")

    if is_hash_legacy(user["password_hash"]):
        new_hash = hash_password(req.password)
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))

    conn.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    log_audit_event(user["id"], "DOCTOR_LOGIN", "users", user["id"], f"Clinician access authorized: {user['role']}")

    access_token = create_access_token(user["id"], user["role"], user["name"])
    refresh_token = create_refresh_token(user["id"])

    user_data = {
        "id": user["id"],
        "phone": user["phone"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "location": user["location"],
    }
    return AuthResponse(
        token=access_token,
        refresh_token=refresh_token,
        user=user_data,
        message="Clinician workstation access authorized.",
    )


@router.post("/refresh")
async def refresh_access_token(req: RefreshTokenRequest) -> dict[str, Any]:
    """Rotate refresh token and issue fresh access token."""
    token_hash = hashlib.sha256(req.refresh_token.encode("utf-8")).hexdigest()
    conn = get_db_connection()
    rt_record = conn.execute(
        "SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0",
        (token_hash,),
    ).fetchone()

    if not rt_record:
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked refresh token.")

    if time.time() > rt_record["expires_at"]:
        conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?", (rt_record["id"],))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired. Please log in.")

    # Revoke old refresh token (refresh token rotation)
    conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?", (rt_record["id"],))

    user = conn.execute("SELECT * FROM users WHERE id = ?", (rt_record["user_id"],)).fetchone()
    if not user or not user["is_active"]:
        conn.commit()
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is no longer active.")

    conn.commit()
    conn.close()

    # Generate new pair
    new_access_token = create_access_token(user["id"], user["role"], user["name"])
    new_refresh_token = create_refresh_token(user["id"])

    return {
        "token": new_access_token,
        "refresh_token": new_refresh_token,
        "message": "Token refreshed successfully.",
    }


@router.post("/logout")
async def logout(req: LogoutRequest) -> dict[str, Any]:
    """Revoke refresh token on sign-out."""
    if req.refresh_token:
        token_hash = hashlib.sha256(req.refresh_token.encode("utf-8")).hexdigest()
        conn = get_db_connection()
        conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?", (token_hash,))
        conn.commit()
        conn.close()
    return {"success": True, "message": "Signed out successfully."}


# ─── Authentication & RBAC Dependencies ──────────────────────────────────────

def get_current_user(authorization: str | None = Header(None)) -> dict[str, Any]:
    """Extract, decode, and verify active user identity from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please sign in.",
        )
    token = authorization.split(" ")[1]
    claims = decode_access_token(token)
    user_id = claims.get("sub")

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or session expired.",
        )
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )
    return dict(user)


def require_role(*allowed_roles: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Enforce strict Role-Based Access Control (RBAC)."""
    roles_upper = [r.upper() for r in allowed_roles]

    def role_checker(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_role = (current_user.get("role") or "").upper()
        if user_role not in roles_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role {' or '.join(roles_upper)}. Your role is {user_role}.",
            )
        return current_user

    return role_checker


# Role convenience dependencies
get_current_patient = require_role("PATIENT", "ADMIN")
get_current_doctor = require_role("DOCTOR", "ADMIN")
get_current_admin = require_role("ADMIN")


@router.get("/me")
async def get_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Retrieve verified profile of current authenticated user."""
    return {
        "id": user["id"],
        "phone": user["phone"],
        "email": user["email"],
        "name": user["name"],
        "age": user["age"],
        "gender": user["gender"],
        "location": user["location"],
        "abha_id": user["abha_id"],
        "pmjay_eligible": bool(user["pmjay_eligible"]),
        "role": user["role"],
        "phone_verified": bool(user["phone_verified"]),
        "email_verified": bool(user["email_verified"]),
        "profile_completed": bool(user["profile_completed"]),
    }
