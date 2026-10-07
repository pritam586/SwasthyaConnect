"""Appointment Scheduling & Consultation Lifecycle Service for SwasthyaConnect.

Manages:
- Appointment booking by authenticated patients (status: REQUESTED)
- Doctor schedule retrieval
- Status workflow: REQUESTED -> CONFIRMED / REJECTED / CANCELLED / COMPLETED
- Real database persistence with strict ownership validation
- Notifications & audit logs
"""

from __future__ import annotations

import secrets
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from .auth_service import get_current_doctor, get_current_user, log_audit_event
from .database import get_db_connection

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class BookAppointmentRequest(BaseModel):
    doctor_id: str = Field(min_length=1)
    slot_date: str = Field(min_length=5)
    slot_time: str = Field(min_length=3)
    notes: str = Field(default="Consultation request")


class UpdateAppointmentStatusRequest(BaseModel):
    status: Literal["CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"]
    notes: str | None = None


# ─── Patient Appointment Endpoints ───────────────────────────────────────────

@router.post("/book")
async def book_appointment(
    req: BookAppointmentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Book a new appointment request for the authenticated patient."""
    conn = get_db_connection()

    # Verify doctor exists in directory
    doctor = conn.execute(
        "SELECT id, name FROM doctors WHERE id = ? OR user_id = ?",
        (req.doctor_id, req.doctor_id),
    ).fetchone()

    if not doctor:
        conn.close()
        raise HTTPException(status_code=404, detail="Selected doctor was not found in directory.")

    apt_id = f"apt-{secrets.token_hex(4)}"
    patient_id = current_user["id"]
    patient_name = current_user["name"]
    doctor_id = doctor["id"]
    doctor_name = doctor["name"]

    conn.execute(
        """
        INSERT INTO appointments (id, patient_id, doctor_id, patient_name, doctor_name, slot_date, slot_time, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?)
        """,
        (
            apt_id,
            patient_id,
            doctor_id,
            patient_name,
            doctor_name,
            req.slot_date,
            req.slot_time,
            req.notes,
        ),
    )

    # Create notification for patient
    conn.execute(
        """
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, 'APPOINTMENT')
        """,
        (
            f"notif-{secrets.token_hex(4)}",
            patient_id,
            "Appointment Requested",
            f"Your appointment request with {doctor_name} for {req.slot_date} at {req.slot_time} is pending confirmation.",
        ),
    )

    conn.commit()
    conn.close()

    log_audit_event(patient_id, "BOOK_APPOINTMENT", "appointments", apt_id, f"With {doctor_name}")

    return {
        "success": True,
        "appointment_id": apt_id,
        "doctor_name": doctor_name,
        "slot_date": req.slot_date,
        "slot_time": req.slot_time,
        "status": "REQUESTED",
        "message": f"Appointment requested with {doctor_name} on {req.slot_date} at {req.slot_time}.",
    }


@router.get("/my")
async def get_my_appointments(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """Retrieve only the authenticated patient's booked appointments."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM appointments WHERE patient_id = ? ORDER BY slot_date DESC, slot_time DESC",
        (current_user["id"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/{apt_id}/cancel")
async def cancel_my_appointment(
    apt_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Patient cancels their pending or confirmed appointment."""
    conn = get_db_connection()
    apt = conn.execute(
        "SELECT id, status, doctor_name FROM appointments WHERE id = ? AND patient_id = ?",
        (apt_id, current_user["id"]),
    ).fetchone()

    if not apt:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found or does not belong to you.")

    if apt["status"] in ("CANCELLED", "COMPLETED"):
        conn.close()
        raise HTTPException(status_code=400, detail=f"Cannot cancel appointment with status {apt['status']}.")

    conn.execute("UPDATE appointments SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (apt_id,))
    conn.commit()
    conn.close()

    log_audit_event(current_user["id"], "CANCEL_APPOINTMENT", "appointments", apt_id, "Patient cancelled")
    return {"success": True, "message": "Appointment cancelled successfully."}


# ─── Clinician Appointment Endpoints ─────────────────────────────────────────

@router.get("/doctor/my")
async def get_doctor_appointments(current_doctor: dict[str, Any] = Depends(get_current_doctor)) -> list[dict[str, Any]]:
    """Retrieve appointments assigned to the logged-in clinician."""
    conn = get_db_connection()
    # Clinician user_id could match doctor_id directly or via doctors table
    doc_profile = conn.execute("SELECT id FROM doctors WHERE user_id = ? OR id = ?", (current_doctor["id"], current_doctor["id"])).fetchone()
    doc_id = doc_profile["id"] if doc_profile else current_doctor["id"]

    rows = conn.execute(
        "SELECT * FROM appointments WHERE doctor_id = ? OR doctor_id = ? ORDER BY slot_date ASC, slot_time ASC",
        (doc_id, current_doctor["id"]),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.patch("/{apt_id}/status")
async def update_appointment_status(
    apt_id: str,
    req: UpdateAppointmentStatusRequest,
    current_doctor: dict[str, Any] = Depends(get_current_doctor),
) -> dict[str, Any]:
    """Doctor confirms, rejects, or completes a clinical appointment."""
    conn = get_db_connection()
    doc_profile = conn.execute("SELECT id FROM doctors WHERE user_id = ? OR id = ?", (current_doctor["id"], current_doctor["id"])).fetchone()
    doc_id = doc_profile["id"] if doc_profile else current_doctor["id"]

    apt = conn.execute(
        "SELECT * FROM appointments WHERE id = ? AND (doctor_id = ? OR doctor_id = ?)",
        (apt_id, doc_id, current_doctor["id"]),
    ).fetchone()

    if not apt:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found or not assigned to your clinician account.")

    conn.execute(
        "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (req.status, apt_id),
    )

    # Notify patient of confirmation or rejection
    conn.execute(
        """
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, 'APPOINTMENT')
        """,
        (
            f"notif-{secrets.token_hex(4)}",
            apt["patient_id"],
            f"Appointment {req.status.capitalize()}",
            f"Your appointment with {apt['doctor_name']} for {apt['slot_date']} at {apt['slot_time']} is now {req.status}.",
        ),
    )

    conn.commit()
    conn.close()

    log_audit_event(current_doctor["id"], f"APPOINTMENT_{req.status}", "appointments", apt_id, f"Doctor updated status to {req.status}")
    return {"success": True, "appointment_id": apt_id, "status": req.status}
