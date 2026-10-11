"""Shared fixtures: every test session gets its own throwaway SQLite database."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

UI_DIR = Path(__file__).resolve().parents[2]
os.environ["SWASTHYA_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")
sys.path.insert(0, str(UI_DIR))

from fastapi.testclient import TestClient  # noqa: E402

from backend.app import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def remove_test_uploads():
    """Report files and heatmaps are written to ui/uploads; delete the ones tests create."""
    uploads = UI_DIR / "uploads"
    before = set(uploads.rglob("*"))
    yield
    for path in set(uploads.rglob("*")) - before:
        if path.is_file():
            path.unlink()


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def patient_token(client: TestClient) -> str:
    phone = "9000000001"
    otp = client.post("/api/v1/auth/send-otp", json={"phone": phone}).json()["otp_hint"]
    response = client.post(
        "/api/v1/auth/signup",
        json={"phone": phone, "name": "Test Patient", "age": 30, "gender": "Female", "password": "pass1234", "otp_code": otp},
    )
    assert response.status_code == 200, response.text
    return response.json()["token"]
