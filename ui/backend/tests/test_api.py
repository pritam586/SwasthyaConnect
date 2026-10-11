"""Regression tests for the patient, triage, ABHA and screening flows."""

from __future__ import annotations

import io
import re
from pathlib import Path

import pytest
from PIL import Image

from backend.app import app
from backend.triage.service import VisualScreeningContext, compute_multimodal_urgency

UI_DIR = Path(__file__).resolve().parents[2]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def png_bytes() -> bytes:
    """A striped image: enough brightness and contrast to pass the quality gate."""
    image = Image.new("RGB", (300, 300), (190, 110, 110))
    for x in range(0, 300, 20):
        image.paste((120, 40, 50), (x, 0, x + 10, 300))
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


# ─── Client/server contract ──────────────────────────────────────────────────

def test_every_frontend_api_path_exists_on_backend():
    # The OpenAPI schema lists routes from included routers too (app.routes may not).
    route_patterns = [
        re.compile("^" + re.sub(r"\{[^}]+\}", "[^/]+", path) + "$")
        for path in app.openapi()["paths"]
        if path.startswith("/api/")
    ]
    called = set()
    for source in (UI_DIR / "src").rglob("*.ts*"):
        for match in re.finditer(r"""["'`](/api/v1/[^"'`?]+)""", source.read_text(encoding="utf-8")):
            # Template literals: ${id} stands for one path segment.
            called.add(re.sub(r"\$\{[^}]+\}", "x", match.group(1)))
    missing = sorted(path for path in called if not any(p.match(path) for p in route_patterns))
    assert not missing, f"Frontend calls routes the backend does not serve: {missing}"


# ─── Patient flows ───────────────────────────────────────────────────────────

def test_reports_and_appointments_use_token(client, patient_token):
    upload = client.post(
        "/api/v1/reports/upload",
        headers=auth(patient_token),
        files={"file": ("r.png", png_bytes(), "image/png")},
        data={"report_title": "CBC"},
    )
    assert upload.status_code == 200, upload.text
    assert client.get("/api/v1/reports/my", headers=auth(patient_token)).json()[0]["report_title"] == "CBC"

    booked = client.post(
        "/api/v1/appointments/book",
        headers=auth(patient_token),
        json={"doctor_id": "doc-001", "slot_date": "2026-10-20", "slot_time": "10:00"},
    )
    assert booked.status_code == 200, booked.text
    assert len(client.get("/api/v1/appointments/my", headers=auth(patient_token)).json()) == 1


def test_medicine_search_uses_q_parameter(client):
    response = client.get("/api/v1/medicines/search", params={"q": "ferrous"})
    assert response.status_code == 200
    assert response.json()


# ─── Triage fusion ───────────────────────────────────────────────────────────

def test_triage_without_image_does_not_claim_pallor():
    urgency, summary, _ = compute_multimodal_urgency(["fatigue or low energy most days"], None)
    assert urgency == "yellow"
    assert "no usable visual screening result" in summary
    assert "pallor flagged" not in summary


def test_empty_visual_context_is_not_a_pallor_finding():
    urgency, summary, _ = compute_multimodal_urgency(["no tiredness or low energy"], VisualScreeningContext())
    assert urgency == "green"
    assert "pallor flagged" not in summary


def test_strong_pallor_with_symptoms_is_red():
    visual = VisualScreeningContext(status="available", confidence=90.0, screening_label="anemia_likely", quality_passed=True)
    urgency, summary, _ = compute_multimodal_urgency(["breathless on exertion most days"], visual)
    assert urgency == "red"
    assert "conjunctival pallor flagged" in summary


def test_negative_answers_stay_green():
    answers = ["no tiredness or low energy", "no breathing difficulty on exertion", "no light-headedness or head pain"]
    assert compute_multimodal_urgency(answers, None)[0] == "green"


def test_triage_case_ids_are_unique(client):
    payload = {"patient_name": "Load Test", "symptom_answers": ["no tiredness or low energy"]}
    ids = {client.post("/api/v1/triage/assess", json=payload).json()["case_id"] for _ in range(200)}
    assert len(ids) == 200


# ─── ABHA ────────────────────────────────────────────────────────────────────

def test_abha_requires_consent(client):
    response = client.post("/api/v1/abha/link", json={"abha_number": "12-3456-7890-1234", "consent_granted": False})
    assert response.status_code == 400


def test_abha_rejects_non_digits(client):
    response = client.post("/api/v1/abha/link", json={"abha_number": "ab-cdef-ghij-klmn", "consent_granted": True})
    assert response.json()["linked"] is False


def test_abha_is_honest_about_sandbox_mode(client):
    body = client.post("/api/v1/abha/link", json={"abha_number": "12345678901234", "consent_granted": True}).json()
    assert body["linked"] is True
    assert body["integration_status"] == "sandbox_mode"
    assert "verified via ABDM" not in body["message"]


# ─── Visual screening ────────────────────────────────────────────────────────

def test_screening_returns_503_without_model(client, monkeypatch):
    from ml import inference_service

    monkeypatch.setattr(inference_service, "_model_readiness_status", lambda: (False, "model missing"))
    response = client.post("/api/v1/visual-screening/analyze", files={"image": ("e.png", png_bytes(), "image/png")})
    assert response.status_code == 503


class _StubModel:
    def __init__(self, output: float):
        self.output = output

    def predict(self, batch, verbose=0):
        assert batch.shape == (1, 224, 224, 3)
        return [[self.output]]


@pytest.mark.parametrize(
    ("raw_output", "output_is_anemia", "expected_label"),
    [
        (0.95, True, "anemia_likely"),
        # Keras sorts folders as anemic, non_anemic: raw 0.95 then means NON-anaemic.
        (0.95, False, "anemia_unlikely"),
        (0.50, True, "inconclusive"),
    ],
)
def test_screening_uses_cnn_probability(client, patient_token, monkeypatch, raw_output, output_is_anemia, expected_label):
    from ml import inference_service

    monkeypatch.setattr(inference_service, "_model_readiness_status", lambda: (True, ""))
    monkeypatch.setattr(inference_service, "_load_model", lambda: (_StubModel(raw_output), "cnn:stub.keras", output_is_anemia))
    response = client.post(
        "/api/v1/visual-screening/analyze",
        headers=auth(patient_token),
        files={"image": ("e.png", png_bytes(), "image/png")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["screening_label"] == expected_label
    assert 0 <= body["confidence"] <= 100
    assert body["analysis_id"]
