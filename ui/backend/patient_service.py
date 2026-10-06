"""Patient-Specific Healthcare API Service for SwasthyaConnect.

Strictly enforces:
- Resource ownership validation (patients can ONLY access their own records)
- Zero predefined, hardcoded, or dummy patient data
- Real database querying for:
  * Profile & Demographics
  * Current Medications (empty state for new users)
  * Prior Health Encounters (empty state for new users)
  * Medical Reports & Prescriptions (empty state for new users)
  * AI Screening History (empty state for new users)
  * Appointments
  * Doctor Directory & Availability
  * Dashboard Aggregation
"""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.auth_service import get_current_user, require_role
from backend.database import get_db_connection

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])
doctor_router = APIRouter(prefix="/api/v1/doctors", tags=["doctors"])


# ─── Pydantic Request Models ─────────────────────────────────────────────────

class PatientProfileUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    location: str | None = None
    blood_group: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None
    medical_history: str | None = None
    abha_id: str | None = None
    pmjay_eligible: bool | None = None


class AddMedicationRequest(BaseModel):
    medicine_name: str = Field(min_length=2)
    generic_name: str | None = None
    dosage: str | None = "1 tablet"
    frequency: str | None = "Once daily"
    route: str = "Oral"
    start_date: str | None = None
    end_date: str | None = None
    instructions: str | None = None


class AddEncounterRequest(BaseModel):
    encounter_date: str = Field(min_length=5)
    reason: str = Field(min_length=3)
    doctor_name: str = "Primary Health Centre Clinician"
    symptoms: str | None = None
    diagnosis_notes: str | None = None
    treatment_notes: str | None = None


class SaveAiAnalysisRequest(BaseModel):
    prediction: str = Field(min_length=2)
    confidence: float = Field(ge=0.0, le=1.0)
    triage_level: Literal["GREEN", "YELLOW", "RED"]
    quality_passed: bool = True
    quality_reason: str | None = None
    grad_cam_url: str | None = None
    explanation: str | None = None


# ─── Patient Profile Endpoints ───────────────────────────────────────────────

@router.get("/me/profile")
async def get_my_profile(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Retrieve authenticated patient's profile from database."""
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],)).fetchone()
    profile_row = conn.execute("SELECT * FROM patient_profiles WHERE user_id = ?", (current_user["id"],)).fetchone()
    conn.close()

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found.")

    res = {
        "id": user_row["id"],
        "name": user_row["name"],
        "phone": user_row["phone"],
        "email": user_row["email"],
        "age": user_row["age"],
        "gender": user_row["gender"],
        "location": user_row["location"],
        "abha_id": user_row["abha_id"],
        "pmjay_eligible": bool(user_row["pmjay_eligible"]),
        "role": user_row["role"],
        "phone_verified": bool(user_row["phone_verified"]),
        "email_verified": bool(user_row["email_verified"]),
        "profile_completed": bool(user_row["profile_completed"]),
    }

    if profile_row:
        res.update({
            "blood_group": profile_row["blood_group"],
            "address": profile_row["address"],
            "emergency_contact": profile_row["emergency_contact"],
            "allergies": profile_row["allergies"],
            "chronic_conditions": profile_row["chronic_conditions"],
            "medical_history": profile_row["medical_history"],
        })
    else:
        res.update({
            "blood_group": None,
            "address": None,
            "emergency_contact": None,
            "allergies": None,
            "chronic_conditions": None,
            "medical_history": None,
        })

    return res


@router.patch("/me/profile")
async def update_my_profile(
    req: PatientProfileUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Update authenticated patient's demographic and health profile."""
    conn = get_db_connection()

    # Update users table
    user_updates = []
    user_params = []
    if req.name is not None:
        user_updates.append("name = ?")
        user_params.append(req.name)
    if req.age is not None:
        user_updates.append("age = ?")
        user_params.append(req.age)
    if req.gender is not None:
        user_updates.append("gender = ?")
        user_params.append(req.gender)
    if req.location is not None:
        user_updates.append("location = ?")
        user_params.append(req.location)
    if req.abha_id is not None:
        user_updates.append("abha_id = ?")
        user_params.append(req.abha_id)
    if req.pmjay_eligible is not None:
        user_updates.append("pmjay_eligible = ?")
        user_params.append(1 if req.pmjay_eligible else 0)

    if user_updates:
        user_updates.append("updated_at = CURRENT_TIMESTAMP")
        user_params.append(current_user["id"])
        conn.execute(f"UPDATE users SET {', '.join(user_updates)} WHERE id = ?", user_params)

    # Ensure patient_profiles record exists
    profile = conn.execute("SELECT id FROM patient_profiles WHERE user_id = ?", (current_user["id"],)).fetchone()
    if not profile:
        conn.execute(
            """
            INSERT INTO patient_profiles (id, user_id, blood_group, address, location, emergency_contact, allergies, chronic_conditions, medical_history, abha_id, pmjay_eligible)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"prof-{secrets.token_hex(4)}",
                current_user["id"],
                req.blood_group,
                req.address,
                req.location,
                req.emergency_contact,
                req.allergies,
                req.chronic_conditions,
                req.medical_history,
                req.abha_id,
                1 if req.pmjay_eligible else 0,
            ),
        )
    else:
        profile_updates = []
        profile_params = []
        if req.blood_group is not None:
            profile_updates.append("blood_group = ?")
            profile_params.append(req.blood_group)
        if req.address is not None:
            profile_updates.append("address = ?")
            profile_params.append(req.address)
        if req.emergency_contact is not None:
            profile_updates.append("emergency_contact = ?")
            profile_params.append(req.emergency_contact)
        if req.allergies is not None:
            profile_updates.append("allergies = ?")
            profile_params.append(req.allergies)
        if req.chronic_conditions is not None:
            profile_updates.append("chronic_conditions = ?")
            profile_params.append(req.chronic_conditions)
        if req.medical_history is not None:
            profile_updates.append("medical_history = ?")
            profile_params.append(req.medical_history)

        if profile_updates:
            profile_updates.append("updated_at = CURRENT_TIMESTAMP")
            profile_params.append(current_user["id"])
            conn.execute(f"UPDATE patient_profiles SET {', '.join(profile_updates)} WHERE user_id = ?", profile_params)

    conn.commit()
    conn.close()

    return {"success": True, "message": "Profile updated successfully."}


# ─── Dashboard Summary ───────────────────────────────────────────────────────

@router.get("/me/dashboard-summary")
async def get_dashboard_summary(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Provide real, aggregate dashboard counts for the authenticated user."""
    conn = get_db_connection()
    pid = current_user["id"]

    med_count = conn.execute("SELECT COUNT(*) as cnt FROM medications WHERE patient_id = ? AND status = 'ACTIVE'", (pid,)).fetchone()["cnt"]
    enc_count = conn.execute("SELECT COUNT(*) as cnt FROM health_encounters WHERE patient_id = ?", (pid,)).fetchone()["cnt"]
    rep_count = conn.execute("SELECT COUNT(*) as cnt FROM medical_reports WHERE patient_id = ?", (pid,)).fetchone()["cnt"]
    rx_count = conn.execute("SELECT COUNT(*) as cnt FROM prescriptions WHERE patient_id = ?", (pid,)).fetchone()["cnt"]
    ai_count = conn.execute("SELECT COUNT(*) as cnt FROM ai_analyses WHERE patient_id = ?", (pid,)).fetchone()["cnt"]

    latest_appointment = conn.execute(
        """
        SELECT * FROM appointments 
        WHERE patient_id = ? AND status IN ('CONFIRMED', 'REQUESTED') 
        ORDER BY slot_date ASC, slot_time ASC LIMIT 1
        """,
        (pid,),
    ).fetchone()

    latest_ai = conn.execute(
        "SELECT * FROM ai_analyses WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1",
        (pid,),
    ).fetchone()

    unread_notifications = conn.execute(
        "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0",
        (pid,),
    ).fetchone()["cnt"]

    conn.close()

    return {
        "user": {
            "id": current_user["id"],
            "name": current_user["name"],
            "role": current_user["role"],
            "location": current_user["location"],
        },
        "counts": {
            "active_medications": med_count,
            "encounters": enc_count,
            "reports": rep_count,
            "prescriptions": rx_count,
            "ai_analyses": ai_count,
            "unread_notifications": unread_notifications,
        },
        "upcoming_appointment": dict(latest_appointment) if latest_appointment else None,
        "latest_ai_screening": dict(latest_ai) if latest_ai else None,
    }


# ─── Medications Endpoints (Strict Resource Ownership) ───────────────────────

@router.get("/me/medications")
async def get_my_medications(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """Retrieve only the authenticated patient's current medications."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC",
        (current_user["id"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/me/medications")
async def add_my_medication(
    req: AddMedicationRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Add a medication entry for the authenticated patient."""
    med_id = f"med-{secrets.token_hex(4)}"
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO medications (id, patient_id, medicine_name, generic_name, dosage, frequency, route, start_date, end_date, status, instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        """,
        (
            med_id,
            current_user["id"],
            req.medicine_name,
            req.generic_name or req.medicine_name,
            req.dosage,
            req.frequency,
            req.route,
            req.start_date,
            req.end_date,
            req.instructions,
        ),
    )
    conn.commit()
    conn.close()
    return {"success": True, "id": med_id, "medicine_name": req.medicine_name}


@router.delete("/me/medications/{med_id}")
async def delete_my_medication(
    med_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Delete a medication after verifying patient ownership."""
    conn = get_db_connection()
    med = conn.execute(
        "SELECT id FROM medications WHERE id = ? AND patient_id = ?",
        (med_id, current_user["id"]),
    ).fetchone()
    if not med:
        conn.close()
        raise HTTPException(status_code=404, detail="Medication record not found or does not belong to you.")

    conn.execute("DELETE FROM medications WHERE id = ?", (med_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Medication removed successfully."}


# ─── Health Encounters Endpoints (Strict Resource Ownership) ─────────────────

@router.get("/me/health-encounters")
async def get_my_encounters(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """Retrieve only the authenticated patient's prior health encounters."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM health_encounters WHERE patient_id = ? ORDER BY encounter_date DESC",
        (current_user["id"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/me/health-encounters")
async def add_my_encounter(
    req: AddEncounterRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Record a clinical health encounter for the authenticated patient."""
    enc_id = f"enc-{secrets.token_hex(4)}"
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO health_encounters (id, patient_id, doctor_name, encounter_date, reason, symptoms, diagnosis_notes, treatment_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            enc_id,
            current_user["id"],
            req.doctor_name,
            req.encounter_date,
            req.reason,
            req.symptoms,
            req.diagnosis_notes,
            req.treatment_notes,
        ),
    )
    conn.commit()
    conn.close()
    return {"success": True, "id": enc_id, "reason": req.reason}


# ─── Prescriptions Endpoints (Strict Resource Ownership) ─────────────────────

@router.get("/me/prescriptions")
async def get_my_prescriptions(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """Retrieve only the authenticated patient's digital prescriptions."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescription_date DESC",
        (current_user["id"],),
    ).fetchall()
    conn.close()

    results = []
    for r in rows:
        meds = []
        try:
            meds = json.loads(r["medicines_json"] or "[]")
        except Exception:
            meds = []
        results.append({
            "id": r["id"],
            "doctor_id": r["doctor_id"],
            "doctor_name": r["doctor_name"],
            "prescription_date": r["prescription_date"],
            "diagnosis": r["diagnosis"],
            "instructions": r["instructions"],
            "status": r["status"],
            "medicines": meds,
            "created_at": str(r["created_at"]),
        })
    return results


# ─── AI Screening History (Strict Resource Ownership) ────────────────────────

@router.get("/me/ai-analyses")
async def get_my_ai_analyses(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """Retrieve authenticated patient's AI screening and triage history."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM ai_analyses WHERE patient_id = ? ORDER BY created_at DESC",
        (current_user["id"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/me/ai-analyses")
async def save_my_ai_analysis(
    req: SaveAiAnalysisRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Save an AI screening result with mandatory clinical disclaimer."""
    analysis_id = f"ai-{secrets.token_hex(4)}"
    disclaimer = (
        "AI screening is an automated assistive decision-support tool and is NOT a definitive clinical diagnosis. "
        "A licensed physician must confirm all findings."
    )
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO ai_analyses (id, patient_id, prediction, confidence, triage_level, quality_passed, quality_reason, grad_cam_url, explanation, disclaimer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            analysis_id,
            current_user["id"],
            req.prediction,
            req.confidence,
            req.triage_level,
            1 if req.quality_passed else 0,
            req.quality_reason,
            req.grad_cam_url,
            req.explanation,
            disclaimer,
        ),
    )
    conn.commit()
    conn.close()
    return {"success": True, "id": analysis_id, "disclaimer": disclaimer}


# ─── Notifications Endpoints ─────────────────────────────────────────────────

@router.get("/me/notifications")
async def get_my_notifications(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        (current_user["id"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.patch("/me/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    conn = get_db_connection()
    conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notif_id, current_user["id"]),
    )
    conn.commit()
    conn.close()
    return {"success": True}


# ─── Doctor Directory Endpoints ──────────────────────────────────────────────

@doctor_router.get("")
async def list_available_doctors() -> list[dict[str, Any]]:
    """Retrieve verified healthcare clinicians from the database."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM doctors WHERE verification_status = 'VERIFIED' ORDER BY rating DESC"
    ).fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        try:
            d["availability"] = json.loads(d["availability_json"] or "[]")
        except Exception:
            d["availability"] = ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"]
        results.append(d)
    return results


@doctor_router.get("/{doc_id}")
async def get_doctor_details(doc_id: str) -> dict[str, Any]:
    """Retrieve doctor profile by ID."""
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM doctors WHERE id = ? OR user_id = ?", (doc_id, doc_id)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    d = dict(row)
    try:
        d["availability"] = json.loads(d["availability_json"] or "[]")
    except Exception:
        d["availability"] = ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"]
    return d
