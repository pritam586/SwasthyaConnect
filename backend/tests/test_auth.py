"""Registration, login, session rotation and role separation."""

from __future__ import annotations

import pytest

from app.config.settings import SettingsError, load_settings
from tests.conftest import next_phone, signup_doctor, signup_patient


def test_patient_signup_with_dev_otp_marks_phone_verified(client):
    phone = next_phone()
    code = client.post("/api/v1/auth/send-otp", json={"phone": phone}).json()["dev_code"]
    response = client.post(
        "/api/v1/auth/signup",
        json={"phone": f"+91 {phone}", "name": "Asha", "password": "password123", "age": 28, "gender": "Female",
              "location": "Hapur", "otp_code": code},
    )
    assert response.status_code == 201
    user = response.json()["user"]
    assert user["phone"] == phone
    assert user["phone_verified"] is True
    assert "password_hash" not in response.text


def test_verify_then_signup_without_code(client):
    phone = next_phone()
    code = client.post("/api/v1/auth/send-otp", json={"phone": phone}).json()["dev_code"]
    assert client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp_code": code}).status_code == 200
    # The same code cannot be verified twice.
    assert client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp_code": code}).status_code == 400
    response = client.post(
        "/api/v1/auth/signup",
        json={"phone": phone, "name": "Asha", "password": "password123", "age": 28, "gender": "Female", "location": "Hapur"},
    )
    assert response.json()["user"]["phone_verified"] is True


def test_wrong_otp_rejects_signup(client):
    phone = next_phone()
    client.post("/api/v1/auth/send-otp", json={"phone": phone})
    response = client.post(
        "/api/v1/auth/signup",
        json={"phone": phone, "name": "Asha", "password": "password123", "age": 28, "gender": "Female",
              "location": "Hapur", "otp_code": "000000"},
    )
    assert response.status_code == 400


def test_duplicate_phone_is_conflict(client):
    patient = signup_patient(client)
    response = client.post(
        "/api/v1/auth/signup",
        json={"phone": patient["phone"], "name": "Other", "password": "password123", "age": 30, "gender": "Male",
              "location": "Pune"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


def test_login_success_and_failure(client):
    patient = signup_patient(client)
    ok = client.post("/api/v1/auth/login", json={"phone": patient["phone"], "password": "password123"})
    assert ok.status_code == 200
    bad = client.post("/api/v1/auth/login", json={"phone": patient["phone"], "password": "wrong-password"})
    assert bad.status_code == 401
    unknown = client.post("/api/v1/auth/login", json={"phone": next_phone(), "password": "password123"})
    assert unknown.status_code == 401
    assert bad.json()["error"]["message"] == unknown.json()["error"]["message"]


def test_doctor_cannot_use_patient_login_and_wrong_password_reveals_nothing(client):
    doctor = signup_doctor(client)
    phone = doctor["user"]["phone"]
    assert client.post("/api/v1/auth/login", json={"phone": phone, "password": "password123"}).status_code == 403
    assert client.post("/api/v1/auth/login", json={"phone": phone, "password": "nope-nope"}).status_code == 401


def test_clinician_login_needs_exact_identifier(client):
    signup_doctor(client)
    response = client.post("/api/v1/auth/doctor/login", json={"identifier": "Dr. Test", "password": "password123"})
    assert response.status_code == 401


def test_refresh_rotates_and_revokes_old_token(client):
    patient = signup_patient(client)
    first = client.post("/api/v1/auth/refresh", json={"refresh_token": patient["refresh_token"]})
    assert first.status_code == 200
    reused = client.post("/api/v1/auth/refresh", json={"refresh_token": patient["refresh_token"]})
    assert reused.status_code == 401
    client.post("/api/v1/auth/logout", json={"refresh_token": first.json()["refresh_token"]})
    after_logout = client.post("/api/v1/auth/refresh", json={"refresh_token": first.json()["refresh_token"]})
    assert after_logout.status_code == 401


def test_protected_route_requires_token(client):
    response = client.get("/api/v1/patients/me/profile")
    assert response.status_code == 401
    assert response.json() == {"error": {"code": "UNAUTHORIZED", "message": "Please sign in to continue."}}


def test_validation_errors_use_standard_shape(client):
    response = client.post("/api/v1/auth/signup", json={"phone": "123"})
    assert response.status_code == 422
    body = response.json()["error"]
    assert body["code"] == "VALIDATION_ERROR"
    assert any(field["field"] == "phone" for field in body["details"])


def test_production_settings_reject_insecure_defaults(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("CORS_ORIGINS", "*")
    monkeypatch.delenv("ENABLE_DEV_OTP", raising=False)
    with pytest.raises(SettingsError):
        load_settings()


def test_production_settings_accept_secure_config(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@db.example.com:5432/swasthya")
    monkeypatch.setenv("JWT_SECRET", "x" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://swasthya.vercel.app")
    monkeypatch.delenv("ENABLE_DEV_OTP", raising=False)
    settings = load_settings()
    assert settings.database_url.startswith("postgresql+psycopg://")
    assert settings.enable_dev_otp is False


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
