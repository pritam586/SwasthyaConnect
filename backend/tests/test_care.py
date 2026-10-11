"""Pharmacy search, appointments, doctor availability, reports and the patient dashboard."""

from __future__ import annotations

from datetime import date, time, timedelta

import pytest

from app.models import Doctor, DoctorAvailability, Medicine, Pharmacy, PharmacyInventory, new_id
from app.utils.clock import clinic_now
from tests.conftest import signup_doctor, signup_patient


@pytest.fixture
def pharmacy_data(db):
    iron = Medicine(id=new_id("mdc"), name="Ferrous Sulfate 200mg", generic_name="Ferrous Sulfate")
    folic = Medicine(id=new_id("mdc"), name="Folic Acid 5mg", generic_name="Folic Acid")
    near = Pharmacy(id=new_id("phm"), name="Near", address="A", latitude=18.5204, longitude=73.8567)
    far = Pharmacy(id=new_id("phm"), name="Far", address="B", latitude=18.60, longitude=73.90)
    other_city = Pharmacy(id=new_id("phm"), name="Delhi", address="C", latitude=28.61, longitude=77.20)
    near.inventory.append(PharmacyInventory(id=new_id("inv"), medicine=iron, stock_status="AVAILABLE", quantity=10))
    far.inventory += [
        PharmacyInventory(id=new_id("inv"), medicine=iron, stock_status="AVAILABLE", quantity=5),
        PharmacyInventory(id=new_id("inv"), medicine=folic, stock_status="OUT_OF_STOCK", quantity=0),
    ]
    db.add_all([iron, folic, near, far, other_city])
    db.commit()


def test_pharmacies_sorted_by_distance_with_partial_stock(client, pharmacy_data):
    patient = signup_patient(client)
    results = client.post("/api/v1/pharmacies/search", headers=patient["headers"], json={
        "latitude": 18.5205, "longitude": 73.8560, "medicines": ["ferrous", "folic"], "radius_km": 50}).json()
    assert [r["name"] for r in results] == ["Near", "Far"]
    assert results[0]["distance_km"] < results[1]["distance_km"]
    assert results[0]["availability"] == "PARTIAL"
    assert {m["status"] for m in results[1]["medicines"]} == {"AVAILABLE", "OUT_OF_STOCK"}


def test_pharmacy_search_without_location(client, pharmacy_data):
    patient = signup_patient(client)
    results = client.post("/api/v1/pharmacies/search", headers=patient["headers"], json={"medicines": []}).json()
    assert [r["name"] for r in results] == ["Delhi", "Far", "Near"]
    assert all(r["distance_km"] is None for r in results)


def test_medicine_search(client, pharmacy_data):
    patient = signup_patient(client)
    found = client.get("/api/v1/medicines/search", params={"q": "folic"}, headers=patient["headers"]).json()
    assert [m["name"] for m in found] == ["Folic Acid 5mg"]


def test_booking_rules_and_doctor_confirmation(client):
    patient = signup_patient(client)
    doctor = signup_doctor(client)
    tomorrow = (clinic_now().date() + timedelta(days=1)).isoformat()
    past = client.post("/api/v1/appointments", headers=patient["headers"],
                       json={"doctor_id": doctor["doctor_id"], "slot_date": "2020-01-01", "slot_time": "10:00"})
    assert past.status_code == 400
    booked = client.post("/api/v1/appointments", headers=patient["headers"],
                         json={"doctor_id": doctor["doctor_id"], "slot_date": tomorrow, "slot_time": "10:00"})
    assert booked.status_code == 201
    clash = client.post("/api/v1/appointments", headers=signup_patient(client)["headers"],
                        json={"doctor_id": doctor["doctor_id"], "slot_date": tomorrow, "slot_time": "10:00"})
    assert clash.status_code == 409

    apt_id = booked.json()["id"]
    assert client.patch(f"/api/v1/appointments/{apt_id}/status", headers=doctor["headers"],
                        json={"status": "COMPLETED"}).status_code == 400
    confirmed = client.patch(f"/api/v1/appointments/{apt_id}/status", headers=doctor["headers"], json={"status": "CONFIRMED"})
    assert confirmed.json()["status"] == "CONFIRMED"
    other_doctor = signup_doctor(client)
    assert client.patch(f"/api/v1/appointments/{apt_id}/status", headers=other_doctor["headers"],
                        json={"status": "COMPLETED"}).status_code == 404
    mine = client.get("/api/v1/appointments/mine", headers=patient["headers"]).json()
    assert mine[0]["status"] == "CONFIRMED"


def test_instant_consult_needs_an_available_doctor(client):
    patient = signup_patient(client)
    doctor = signup_doctor(client)
    payload = {"doctor_id": doctor["doctor_id"]}
    assert client.post("/api/v1/appointments/instant", headers=patient["headers"], json=payload).status_code == 409

    client.patch("/api/v1/doctors/me/status", headers=doctor["headers"], json={"is_online": True})
    available = client.get("/api/v1/doctors?available_now=true", headers=patient["headers"]).json()
    assert [d["id"] for d in available] == [doctor["doctor_id"]]
    response = client.post("/api/v1/appointments/instant", headers=patient["headers"], json=payload)
    assert response.status_code == 201 and response.json()["appointment_type"] == "INSTANT"


def test_weekly_availability_window(db, client):
    doctor = signup_doctor(client)
    now = clinic_now()
    record = db.get(Doctor, doctor["doctor_id"])
    record.availability.append(DoctorAvailability(id=new_id("avl"), day_of_week=now.weekday(),
                                                  start_time=time(0, 0), end_time=time(23, 59)))
    db.commit()
    patient = signup_patient(client)
    listed = client.get("/api/v1/doctors?available_now=true", headers=patient["headers"]).json()
    assert [d["id"] for d in listed] == [doctor["doctor_id"]]


def test_report_upload_matches_medicines_from_pdf_text_only(client, db, monkeypatch):
    db.add(Medicine(id=new_id("mdc"), name="Folic Acid 5mg", generic_name="Folic Acid"))
    db.commit()
    patient = signup_patient(client)
    image = client.post("/api/v1/reports", headers=patient["headers"],
                        files={"file": ("folic acid.png", b"\x89PNG....", "image/png")}).json()
    assert image["extracted_medicines"] == []

    from app.services import report_service

    monkeypatch.setattr(report_service, "extract_pdf_text", lambda _content: "Rx: Folic Acid 5 mg once daily")
    pdf = client.post("/api/v1/reports", headers=patient["headers"],
                      files={"file": ("rx.pdf", b"%PDF-1.4", "application/pdf")}).json()
    assert [m["name"] for m in pdf["extracted_medicines"]] == ["Folic Acid 5mg"]

    wrong_type = client.post("/api/v1/reports", headers=patient["headers"],
                             files={"file": ("x.exe", b"MZ", "application/octet-stream")})
    assert wrong_type.status_code == 415


def test_dashboard_counts(client):
    patient = signup_patient(client)
    client.post("/api/v1/patients/me/medications", headers=patient["headers"], json={"medicine_name": "Folic Acid"})
    client.post("/api/v1/patients/me/encounters", headers=patient["headers"],
                json={"encounter_date": date.today().isoformat(), "reason": "Fever check"})
    summary = client.get("/api/v1/patients/me/dashboard", headers=patient["headers"]).json()
    assert summary["active_medications"] == 1 and summary["encounters"] == 1


def test_profile_update_cannot_change_identity_fields(client):
    patient = signup_patient(client)
    response = client.patch("/api/v1/patients/me/profile", headers=patient["headers"],
                            json={"blood_group": "O+", "abha_id": "11-1111-1111-1111", "role": "ADMIN"})
    assert response.status_code == 200
    body = response.json()
    assert body["blood_group"] == "O+" and body["abha_id"] is None
    me = client.get("/api/v1/auth/me", headers=patient["headers"]).json()
    assert me["role"] == "PATIENT"
