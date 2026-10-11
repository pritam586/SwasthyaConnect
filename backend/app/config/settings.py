"""Environment-driven settings. Every value comes from the process environment.

Production refuses to start with insecure defaults (missing JWT secret, wildcard CORS,
dev OTP enabled, or no DATABASE_URL), so a misconfigured deploy fails loudly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]

_DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me-0000000000"


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    value = os.getenv(name)
    return int(value) if value and value.strip() else default


def _list(name: str, default: list[str]) -> list[str]:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


def normalize_database_url(url: str) -> str:
    """Render and Heroku hand out postgres:// URLs; SQLAlchemy needs an explicit driver."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _service_url(raw: str) -> str:
    """Render's private network gives "host:port" with no scheme; internal traffic is plain HTTP."""
    url = raw.strip().rstrip("/")
    if url and "://" not in url:
        url = f"http://{url}"
    return url


class SettingsError(RuntimeError):
    """Raised when the environment cannot run the service safely."""


@dataclass(frozen=True)
class Settings:
    environment: str
    database_url: str
    jwt_secret: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    cors_origins: list[str]
    ml_service_url: str
    ml_service_token: str
    ml_timeout_seconds: int
    enable_dev_otp: bool
    require_phone_verification: bool
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_verify_service_sid: str
    clinic_timezone: str
    max_upload_mb: int
    auth_rate_limit_per_minute: int
    log_level: str
    errors: list[str] = field(default_factory=list)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def twilio_configured(self) -> bool:
        return bool(self.twilio_account_sid and self.twilio_auth_token and self.twilio_verify_service_sid)


def load_settings() -> Settings:
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    is_production = environment == "production"

    default_db = f"sqlite:///{(BACKEND_DIR / 'swasthya_connect.db').as_posix()}"
    raw_db_url = os.getenv("DATABASE_URL", "").strip()

    settings = Settings(
        environment=environment,
        database_url=normalize_database_url(raw_db_url or default_db),
        jwt_secret=os.getenv("JWT_SECRET", "").strip() or _DEV_JWT_SECRET,
        access_token_expire_minutes=_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60),
        refresh_token_expire_days=_int("REFRESH_TOKEN_EXPIRE_DAYS", 7),
        cors_origins=_list("CORS_ORIGINS", ["http://localhost:3000", "http://127.0.0.1:3000"]),
        ml_service_url=_service_url(os.getenv("ML_SERVICE_URL", "")),
        ml_service_token=os.getenv("ML_SERVICE_TOKEN", "").strip(),
        ml_timeout_seconds=_int("ML_TIMEOUT_SECONDS", 60),
        enable_dev_otp=_bool("ENABLE_DEV_OTP", not is_production),
        require_phone_verification=_bool("REQUIRE_PHONE_VERIFICATION", False),
        twilio_account_sid=os.getenv("TWILIO_ACCOUNT_SID", "").strip(),
        twilio_auth_token=os.getenv("TWILIO_AUTH_TOKEN", "").strip(),
        twilio_verify_service_sid=os.getenv("TWILIO_VERIFY_SERVICE_SID", "").strip(),
        clinic_timezone=os.getenv("CLINIC_TIMEZONE", "Asia/Kolkata").strip(),
        max_upload_mb=_int("MAX_UPLOAD_MB", 10),
        auth_rate_limit_per_minute=_int("AUTH_RATE_LIMIT_PER_MINUTE", 20),
        log_level=os.getenv("LOG_LEVEL", "INFO").strip().upper(),
    )

    if is_production:
        problems = []
        if not raw_db_url:
            problems.append("DATABASE_URL must be set in production.")
        if settings.jwt_secret == _DEV_JWT_SECRET or len(settings.jwt_secret) < 32:
            problems.append("JWT_SECRET must be set to a random value of at least 32 characters.")
        if not os.getenv("CORS_ORIGINS", "").strip() or "*" in settings.cors_origins:
            problems.append("CORS_ORIGINS must list the deployed frontend origin(s), not '*'.")
        if settings.enable_dev_otp:
            problems.append("ENABLE_DEV_OTP must be false in production.")
        if problems:
            raise SettingsError(" ".join(problems))
    return settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()
