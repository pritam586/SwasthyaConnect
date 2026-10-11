"""Each test session runs against a fresh SQLite database built from the models."""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

_DB = Path(tempfile.mkdtemp()) / "test.db"
os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": f"sqlite:///{_DB.as_posix()}",
        "ENABLE_DEV_OTP": "true",
        "AUTH_RATE_LIMIT_PER_MINUTE": "0",
        "ML_SERVICE_URL": "",
    }
)

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import delete  # noqa: E402

from app.config.database import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402

Base.metadata.create_all(engine)


@pytest.fixture(autouse=True)
def clean_database() -> Iterator[None]:
    yield
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(delete(table))


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


_phone_counter = iter(range(9000000000, 9099999999))


def next_phone() -> str:
    return str(next(_phone_counter))


def signup_patient(client: TestClient, name: str = "Test Patient") -> dict:
    phone = next_phone()
    response = client.post(
        "/api/v1/auth/signup",
        json={"phone": phone, "name": name, "password": "password123", "age": 30, "gender": "Female", "location": "Pune"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    body["headers"] = {"Authorization": f"Bearer {body['access_token']}"}
    body["phone"] = phone
    return body


def signup_doctor(client: TestClient, verify: bool = True) -> dict:
    phone = next_phone()
    response = client.post(
        "/api/v1/auth/doctor/signup",
        json={"phone": phone, "name": "Dr. Test", "password": "password123", "email": f"dr{phone}@example.com",
              "specialization": "General Medicine", "qualification": "MBBS", "license_number": f"LIC-{phone}",
              "location": "Pune"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    body["headers"] = {"Authorization": f"Bearer {body['access_token']}"}
    if verify:
        from app.models import Doctor, User

        with SessionLocal() as session:
            user = session.get(User, body["user"]["id"])
            user.doctor_profile.verification_status = "VERIFIED"
            session.commit()
            body["doctor_id"] = user.doctor_profile.id
    return body


def make_admin(client: TestClient) -> dict:
    from app.constants import Role
    from app.models import User, new_id
    from app.utils.security import hash_password

    phone = next_phone()
    with SessionLocal() as session:
        session.add(User(id=new_id("usr"), name="Admin", phone=phone, email=f"admin{phone}@example.com",
                         password_hash=hash_password("adminpass123"), role=Role.ADMIN))
        session.commit()
    response = client.post("/api/v1/auth/doctor/login", json={"identifier": phone, "password": "adminpass123"})
    assert response.status_code == 200, response.text
    return {"headers": {"Authorization": f"Bearer {response.json()['access_token']}"}}
