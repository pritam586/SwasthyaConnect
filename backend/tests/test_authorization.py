"""Records belong to their patient; doctors see patients only through clinical workflows."""

from __future__ import annotations

from tests.conftest import make_admin, signup_doctor, signup_patient


def _upload_report(client, patient) -> dict:
    response = client.post(
        "/api/v1/reports",
        headers=patient["headers"],
        files={"file": ("cbc.png", b"\x89PNG\r\n\x1a\nfake", "image/png")},
        data={"report_title": "CBC"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_patients_cannot_touch_each_others_records(client):
    alice, bob = signup_patient(client, "Alice"), signup_patient(client, "Bob")
    med = client.post("/api/v1/patients/me/medications", headers=alice["headers"],
                      json={"medicine_name": "Folic Acid"}).json()
    assert client.delete(f"/api/v1/patients/me/medications/{med['id']}", headers=bob["headers"]).status_code == 404
    assert client.get("/api/v1/patients/me/medications", headers=bob["headers"]).json() == []

    report = _upload_report(client, alice)
    assert client.get(f"/api/v1/files/{report['file_id']}", headers=bob["headers"]).status_code == 404
    assert client.delete(f"/api/v1/reports/{report['id']}", headers=bob["headers"]).status_code == 404
    assert client.get(f"/api/v1/files/{report['file_id']}", headers=alice["headers"]).status_code == 200


def test_doctor_sees_patient_files_only_with_a_workflow(client):
    patient = signup_patient(client)
    doctor = signup_doctor(client)
    report = _upload_report(client, patient)
    assert client.get(f"/api/v1/files/{report['file_id']}", headers=doctor["headers"]).status_code == 404

    client.post("/api/v1/triage/cases", headers=patient["headers"], json={"symptoms": ["fatigue most days"]})
    assert client.get(f"/api/v1/files/{report['file_id']}", headers=doctor["headers"]).status_code == 200


def test_unverified_doctor_is_blocked_from_clinical_data(client):
    doctor = signup_doctor(client, verify=False)
    assert doctor["user"]["doctor_verification_status"] == "PENDING"
    assert client.get("/api/v1/clinical/cases", headers=doctor["headers"]).status_code == 403
    assert client.get("/api/v1/doctors/me", headers=doctor["headers"]).status_code == 200


def test_admin_verifies_doctor(client):
    doctor = signup_doctor(client, verify=False)
    admin = make_admin(client)
    pending = client.get("/api/v1/admin/doctors?verification=PENDING", headers=admin["headers"]).json()
    doctor_id = next(d["id"] for d in pending if d["license_number"] == f"LIC-{doctor['user']['phone']}")
    response = client.patch(f"/api/v1/admin/doctors/{doctor_id}/verification", headers=admin["headers"],
                            json={"status": "VERIFIED"})
    assert response.status_code == 200
    assert client.get("/api/v1/clinical/cases", headers=doctor["headers"]).status_code == 200


def test_roles_are_enforced(client):
    patient = signup_patient(client)
    doctor = signup_doctor(client)
    assert client.get("/api/v1/admin/stats", headers=patient["headers"]).status_code == 403
    assert client.get("/api/v1/admin/stats", headers=doctor["headers"]).status_code == 403
    assert client.get("/api/v1/clinical/cases", headers=patient["headers"]).status_code == 403
    assert client.get("/api/v1/patients/me/profile", headers=doctor["headers"]).status_code == 403


def test_deactivated_account_is_locked_out(client):
    patient = signup_patient(client)
    admin = make_admin(client)
    client.patch(f"/api/v1/admin/users/{patient['user']['id']}/status", headers=admin["headers"], json={"is_active": False})
    assert client.get("/api/v1/patients/me/profile", headers=patient["headers"]).status_code == 403
