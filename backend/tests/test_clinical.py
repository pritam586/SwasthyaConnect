"""Screening, triage, the clinician queue, and prescriptions."""

from __future__ import annotations

import base64

from app.services import ml_client
from app.utils.errors import ServiceUnavailableError
from tests.conftest import signup_doctor, signup_patient

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


def _fake_ml(label="anemia_likely", confidence=90.0, quality=True):
    def analyze(image, content_type, file_name):
        return ml_client.MlAnalysis(
            quality_passed=quality, quality_reason="" if quality else "Too dark", screening_label=label,
            confidence=confidence, triage_level="RED", explanation="test", model_version="cnn:test.keras",
            heatmap_png=base64.b64decode(base64.b64encode(PNG)),
        )

    return analyze


def _screen(client, patient):
    return client.post("/api/v1/screenings", headers=patient["headers"], files={"image": ("eye.png", PNG, "image/png")})


def test_screening_is_unavailable_without_ml_service(client):
    patient = signup_patient(client)
    response = _screen(client, patient)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_screening_stores_result_and_heatmap(client, monkeypatch):
    monkeypatch.setattr(ml_client, "analyze_eye_image", _fake_ml())
    patient = signup_patient(client)
    body = _screen(client, patient).json()
    assert body["screening_label"] == "anemia_likely"
    assert body["heatmap_file_id"]
    assert "not a diagnosis" in body["disclaimer"]
    heatmap = client.get(f"/api/v1/files/{body['heatmap_file_id']}", headers=patient["headers"])
    assert heatmap.status_code == 200
    assert heatmap.headers["content-type"] == "image/png"


def test_failed_quality_gate_is_not_stored(client, monkeypatch):
    monkeypatch.setattr(ml_client, "analyze_eye_image", _fake_ml(quality=False))
    patient = signup_patient(client)
    body = _screen(client, patient).json()
    assert body["id"] is None and body["quality_passed"] is False
    assert client.get("/api/v1/screenings", headers=patient["headers"]).json() == []


def test_ml_service_down_reports_unavailable(client, monkeypatch):
    def down(*_args):
        raise ServiceUnavailableError("Visual screening is temporarily unavailable.")

    monkeypatch.setattr(ml_client, "analyze_eye_image", down)
    assert _screen(client, signup_patient(client)).status_code == 503


def test_triage_without_screening_never_claims_pallor(client):
    patient = signup_patient(client)
    body = client.post("/api/v1/triage/cases", headers=patient["headers"],
                       json={"symptoms": ["fatigue or low energy most days"]}).json()
    assert body["urgency"] == "yellow"
    assert body["visual_confidence"] == 0
    assert "pallor flagged" not in body["summary"]


def test_triage_uses_only_the_patients_own_screening(client, monkeypatch):
    monkeypatch.setattr(ml_client, "analyze_eye_image", _fake_ml(confidence=90.0))
    alice, bob = signup_patient(client, "Alice"), signup_patient(client, "Bob")
    screening = _screen(client, alice).json()
    stolen = client.post("/api/v1/triage/cases", headers=bob["headers"],
                         json={"symptoms": ["breathless"], "screening_id": screening["id"]})
    assert stolen.status_code == 404
    own = client.post("/api/v1/triage/cases", headers=alice["headers"],
                      json={"symptoms": ["breathless on exertion most days"], "screening_id": screening["id"]}).json()
    assert own["urgency"] == "red"
    assert own["visual_confidence"] == 90.0


def test_queue_is_sorted_by_urgency_and_prescription_updates_records(client):
    doctor = signup_doctor(client)
    green_patient, red_patient = signup_patient(client, "Green"), signup_patient(client, "Red")
    client.post("/api/v1/triage/cases", headers=green_patient["headers"], json={"symptoms": ["no tiredness"]})
    red = client.post("/api/v1/triage/cases", headers=red_patient["headers"], json={"symptoms": ["chest pain"]}).json()

    queue = client.get("/api/v1/clinical/cases", headers=doctor["headers"]).json()
    assert [c["urgency"] for c in queue] == ["red", "green"]

    rx = client.post(f"/api/v1/clinical/cases/{red['id']}/prescription", headers=doctor["headers"], json={
        "diagnosis": "Iron-deficiency anaemia",
        "medicines": [{"name": "Ferrous Sulfate 200mg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "90 days"}],
    })
    assert rx.status_code == 200 and rx.json()["status"] == "reviewed"
    again = client.post(f"/api/v1/clinical/cases/{red['id']}/prescription", headers=doctor["headers"], json={
        "diagnosis": "Again", "medicines": [{"name": "X tablet", "dosage": "1", "frequency": "1", "duration": "1"}]})
    assert again.status_code == 400

    prescriptions = client.get("/api/v1/patients/me/prescriptions", headers=red_patient["headers"]).json()
    assert prescriptions[0]["diagnosis"] == "Iron-deficiency anaemia"
    meds = client.get("/api/v1/patients/me/medications", headers=red_patient["headers"]).json()
    assert meds[0]["medicine_name"] == "Ferrous Sulfate 200mg"
    assert client.get("/api/v1/patients/me/encounters", headers=red_patient["headers"]).json()


def test_abha_requires_consent_and_valid_digits(client):
    patient = signup_patient(client)
    no_consent = client.post("/api/v1/abha/link", headers=patient["headers"], json={"abha_number": "12-3456-7890-1234"})
    assert no_consent.status_code == 400
    invalid = client.post("/api/v1/abha/link", headers=patient["headers"],
                          json={"abha_number": "ab-cdef-ghij-klmn", "consent_granted": True}).json()
    assert invalid["linked"] is False
    linked = client.post("/api/v1/abha/link", headers=patient["headers"],
                         json={"abha_number": "12345678901234", "consent_granted": True}).json()
    assert linked["integration_status"] == "sandbox_mode" and linked["abha_number"] == "12-3456-7890-1234"
    profile = client.get("/api/v1/patients/me/profile", headers=patient["headers"]).json()
    assert profile["abha_id"] == "12-3456-7890-1234"
