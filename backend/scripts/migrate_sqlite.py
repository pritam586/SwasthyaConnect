"""One-off copy of patient data from the old ui/ SQLite database into the new schema.

    python -m scripts.migrate_sqlite --source ../ui/swasthya_connect.db --uploads ../ui/uploads

Copies patients (with their password hashes, so they keep their passwords), profiles,
medications, encounters, medical reports (file bytes are read from --uploads), triage cases,
and the medicine/pharmacy/stock tables. Skips the old seeded demo doctor/admin accounts,
sessions, OTPs, audit logs and notifications. Safe to re-run: existing ids are skipped.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import sqlite3
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.config.database import SessionLocal
from app.constants import Role
from app.models import (
    HealthEncounter,
    MedicalReport,
    Medication,
    Medicine,
    PatientProfile,
    Pharmacy,
    PharmacyInventory,
    StoredFile,
    TriageCase,
    User,
)
from app.utils.phone import normalize_phone


def _date(value) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def col(row: sqlite3.Row, name: str, default=None):
    """Older databases lack some columns; treat those as empty."""
    return row[name] if name in row.keys() else default


def _report_file(uploads: Path, row: sqlite3.Row) -> Path | None:
    folder = uploads / "reports"
    candidates = [folder / Path(str(col(row, name) or "")).name for name in ("file_name", "file_path", "file_url")]
    candidates += sorted(folder.glob(f"{col(row, 'id')}_*"))
    return next((path for path in candidates if path.name and path.is_file()), None)


def _rows(conn: sqlite3.Connection, table: str) -> list[sqlite3.Row]:
    try:
        return conn.execute(f"SELECT * FROM {table}").fetchall()  # noqa: S608 - fixed table names
    except sqlite3.OperationalError:
        return []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--uploads", type=Path, default=None)
    args = parser.parse_args()

    old = sqlite3.connect(f"file:{args.source.resolve().as_posix()}?mode=ro", uri=True)
    old.row_factory = sqlite3.Row
    counts: dict[str, int] = {}

    def add(db, obj, label):
        if db.get(type(obj), obj.id) is None:
            db.add(obj)
            counts[label] = counts.get(label, 0) + 1

    with SessionLocal() as db:
        patients: set[str] = set()
        for row in _rows(old, "users"):
            phone = normalize_phone(col(row, "phone") or "")
            if (col(row, "role") or "PATIENT").upper() != Role.PATIENT or phone is None:
                continue
            patients.add(col(row, "id"))
            add(db, User(id=col(row, "id"), name=col(row, "name"), phone=phone, email=None,
                         password_hash=col(row, "password_hash"), role=Role.PATIENT, age=col(row, "age"),
                         gender=col(row, "gender"), location=col(row, "location"), abha_id=col(row, "abha_id"),
                         phone_verified=bool(col(row, "phone_verified")), is_active=bool(col(row, "is_active"))), "patients")
        db.flush()

        for row in _rows(old, "patient_profiles"):
            if col(row, "user_id") in patients:
                add(db, PatientProfile(id=col(row, "id"), user_id=col(row, "user_id"), blood_group=col(row, "blood_group"),
                                       address=col(row, "address"), emergency_contact=col(row, "emergency_contact"),
                                       allergies=col(row, "allergies"), chronic_conditions=col(row, "chronic_conditions"),
                                       medical_history=col(row, "medical_history")), "profiles")

        for row in _rows(old, "medications"):
            if col(row, "patient_id") in patients:
                add(db, Medication(id=col(row, "id"), patient_id=col(row, "patient_id"), medicine_name=col(row, "medicine_name"),
                                   generic_name=col(row, "generic_name"), dosage=col(row, "dosage"), frequency=col(row, "frequency"),
                                   route=col(row, "route") or "Oral", start_date=_date(col(row, "start_date")),
                                   end_date=_date(col(row, "end_date")), prescribed_by=col(row, "prescribed_by"),
                                   status=col(row, "status") or "ACTIVE", instructions=col(row, "instructions")), "medications")

        for row in _rows(old, "health_encounters"):
            if col(row, "patient_id") in patients and _date(col(row, "encounter_date")):
                add(db, HealthEncounter(id=col(row, "id"), patient_id=col(row, "patient_id"), doctor_name=col(row, "doctor_name"),
                                        encounter_date=_date(col(row, "encounter_date")), reason=col(row, "reason"),
                                        symptoms=col(row, "symptoms"), diagnosis_notes=col(row, "diagnosis_notes"),
                                        treatment_notes=col(row, "treatment_notes")), "encounters")

        for row in _rows(old, "medical_reports"):
            if col(row, "patient_id") not in patients or args.uploads is None:
                continue
            path = _report_file(args.uploads, row)
            if path is None:
                print(f"Report file missing, skipped: {row['id']}")
                continue
            data = path.read_bytes()
            content_type = col(row, "file_type") or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            file_id = f"fil-{row['id']}"
            add(db, StoredFile(id=file_id, owner_id=col(row, "patient_id"), kind="REPORT", content_type=content_type,
                               file_name=col(row, "original_file_name") or path.name, size_bytes=len(data), data=data), "files")
            db.flush()
            add(db, MedicalReport(id=col(row, "id"), patient_id=col(row, "patient_id"), file_id=file_id,
                                  report_title=col(row, "report_title"), report_type=col(row, "report_type") or "Lab report",
                                  original_file_name=col(row, "original_file_name") or path.name, file_type=content_type,
                                  extracted_text=col(row, "extracted_text"),
                                  extracted_medicines=json.loads(col(row, "extracted_medicines_json") or "[]"),
                                  summary=col(row, "ai_summary")), "reports")

        for row in _rows(old, "triage_cases"):
            if col(row, "user_id") in patients:
                add(db, TriageCase(id=col(row, "id"), patient_id=col(row, "user_id"), symptoms=json.loads(col(row, "symptoms_json") or "[]"),
                                   visual_confidence=float(col(row, "visual_confidence") or 0.0), summary=col(row, "ai_summary"),
                                   explanation="Migrated from the previous version.", urgency=col(row, "urgency"),
                                   status=col(row, "status") or "pending", diagnosis=col(row, "diagnosis"),
                                   clinical_notes=col(row, "rx_notes")), "triage_cases")

        # Medicine names are unique: reuse an existing catalogue entry (e.g. from seed_demo) instead.
        medicine_ids = {name.lower(): mid for mid, name in db.execute(select(Medicine.id, Medicine.name))}
        medicine_map: dict[str, str] = {}
        for row in _rows(old, "medicines"):
            existing = medicine_ids.get(str(col(row, "name")).lower())
            if existing:
                medicine_map[col(row, "id")] = existing
                continue
            medicine_map[col(row, "id")] = col(row, "id")
            add(db, Medicine(id=col(row, "id"), name=col(row, "name"), generic_name=col(row, "generic_name"), strength=col(row, "strength"),
                             form=col(row, "form") or "Tablet", category=col(row, "category"), mrp_inr=col(row, "mrp_inr"),
                             jan_aushadhi_price_inr=col(row, "jan_aushadhi_price_inr"), manufacturer=col(row, "manufacturer"),
                             description=col(row, "description")), "medicines")
        for row in _rows(old, "pharmacies"):
            add(db, Pharmacy(id=col(row, "id"), name=col(row, "name"), address=col(row, "address"), latitude=col(row, "latitude"),
                             longitude=col(row, "longitude"), phone=col(row, "phone"), is_jan_aushadhi=bool(col(row, "is_jan_aushadhi")),
                             open_hours=col(row, "open_hours"), active=bool(col(row, "active"))), "pharmacies")
        db.flush()
        stocked = set(db.execute(select(PharmacyInventory.pharmacy_id, PharmacyInventory.medicine_id)))
        for row in _rows(old, "pharmacy_inventory"):
            medicine_id = medicine_map.get(col(row, "medicine_id"), col(row, "medicine_id"))
            if (col(row, "pharmacy_id"), medicine_id) in stocked:
                continue
            stocked.add((col(row, "pharmacy_id"), medicine_id))
            add(db, PharmacyInventory(id=col(row, "id"), pharmacy_id=col(row, "pharmacy_id"), medicine_id=medicine_id,
                                      stock_status=col(row, "stock_status") or "AVAILABLE", quantity=col(row, "quantity") or 0,
                                      price_inr=col(row, "price")), "inventory")
        db.commit()

    print("Migrated:", ", ".join(f"{k}={v}" for k, v in counts.items()) or "nothing new")


if __name__ == "__main__":
    main()
