"""Administrative Management & System Analytics Service for SwasthyaConnect.

Protected by strict Role-Based Access Control (RBAC: ADMIN role only).
Supports:
- User directory management & role changes
- Doctor verification & onboarding
- Pharmacy directory & inventory management
- Medicine catalogue editing
- Platform telemetry, system statistics & HIPAA audit log inspection
"""

from __future__ import annotations

import secrets
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from .auth_service import get_current_admin, log_audit_event
from .database import get_db_connection

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class CreateDoctorRequest(BaseModel):
    name: str = Field(min_length=2)
    phone: str = Field(min_length=10)
    email: str | None = None
    specialization: str
    qualification: str
    experience_years: int = 0
    license_number: str | None = None
    clinic_name: str
    location: str
    consultation_fee: float = 0.0


class CreatePharmacyRequest(BaseModel):
    name: str = Field(min_length=2)
    address: str = Field(min_length=5)
    latitude: float
    longitude: float
    phone: str | None = None
    is_jan_aushadhi: bool = False
    open_hours: str = "8:00 AM - 9:00 PM"


class CreateMedicineRequest(BaseModel):
    name: str = Field(min_length=2)
    generic_name: str = Field(min_length=2)
    strength: str
    form: str = "Tablet"
    category: str
    mrp_inr: float = 0.0
    jan_aushadhi_price_inr: float = 0.0
    manufacturer: str | None = None
    description: str | None = None


class UpdateInventoryRequest(BaseModel):
    pharmacy_id: str
    medicine_id: str
    stock_status: str = "AVAILABLE"  # AVAILABLE, LOW_STOCK, OUT_OF_STOCK
    quantity: int = 0
    price: float = 0.0


# ─── System Analytics ────────────────────────────────────────────────────────

@router.get("/stats")
async def get_system_stats(admin: dict[str, Any] = Depends(get_current_admin)) -> dict[str, Any]:
    """Retrieve platform-wide operational statistics."""
    conn = get_db_connection()

    user_count = conn.execute("SELECT COUNT(*) as cnt FROM users").fetchone()["cnt"]
    patient_count = conn.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'PATIENT'").fetchone()["cnt"]
    doctor_count = conn.execute("SELECT COUNT(*) as cnt FROM doctors").fetchone()["cnt"]
    pharmacy_count = conn.execute("SELECT COUNT(*) as cnt FROM pharmacies").fetchone()["cnt"]
    medicine_count = conn.execute("SELECT COUNT(*) as cnt FROM medicines").fetchone()["cnt"]
    appointment_count = conn.execute("SELECT COUNT(*) as cnt FROM appointments").fetchone()["cnt"]
    triage_count = conn.execute("SELECT COUNT(*) as cnt FROM triage_cases").fetchone()["cnt"]
    ai_count = conn.execute("SELECT COUNT(*) as cnt FROM ai_analyses").fetchone()["cnt"]
    reports_count = conn.execute("SELECT COUNT(*) as cnt FROM medical_reports").fetchone()["cnt"]

    conn.close()

    return {
        "users": {"total": user_count, "patients": patient_count, "doctors": doctor_count},
        "facilities": {"pharmacies": pharmacy_count, "medicines": medicine_count},
        "clinical": {
            "appointments": appointment_count,
            "triage_cases": triage_count,
            "ai_analyses": ai_count,
            "medical_reports": reports_count,
        },
    }


# ─── User Management ─────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(admin: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT id, name, phone, email, role, phone_verified, is_active, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 100"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.patch("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    is_active: bool,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    conn = get_db_connection()
    conn.execute("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (1 if is_active else 0, user_id))
    conn.commit()
    conn.close()
    log_audit_event(admin["id"], "ADMIN_UPDATE_USER_STATUS", "users", user_id, f"Active: {is_active}")
    return {"success": True, "message": f"User status updated to {'active' if is_active else 'inactive'}."}


# ─── Pharmacy & Inventory Management ─────────────────────────────────────────

@router.get("/pharmacies")
async def admin_list_pharmacies(admin: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM pharmacies ORDER BY name ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/pharmacies")
async def admin_create_pharmacy(
    req: CreatePharmacyRequest,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    pharma_id = f"pharma-{secrets.token_hex(4)}"
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO pharmacies (id, name, address, latitude, longitude, phone, is_jan_aushadhi, open_hours, rating, verified, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4.7, 1, 1)
        """,
        (
            pharma_id,
            req.name,
            req.address,
            req.latitude,
            req.longitude,
            req.phone,
            1 if req.is_jan_aushadhi else 0,
            req.open_hours,
        ),
    )
    conn.commit()
    conn.close()
    log_audit_event(admin["id"], "ADMIN_CREATE_PHARMACY", "pharmacies", pharma_id, req.name)
    return {"success": True, "id": pharma_id, "name": req.name}


@router.post("/inventory")
async def admin_update_inventory(
    req: UpdateInventoryRequest,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    inv_id = f"inv-{secrets.token_hex(4)}"
    conn = get_db_connection()
    existing = conn.execute(
        "SELECT id FROM pharmacy_inventory WHERE pharmacy_id = ? AND medicine_id = ?",
        (req.pharmacy_id, req.medicine_id),
    ).fetchone()

    if existing:
        conn.execute(
            """
            UPDATE pharmacy_inventory 
            SET stock_status = ?, quantity = ?, price = ?, last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (req.stock_status, req.quantity, req.price, existing["id"]),
        )
    else:
        conn.execute(
            """
            INSERT INTO pharmacy_inventory (id, pharmacy_id, medicine_id, stock_status, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (inv_id, req.pharmacy_id, req.medicine_id, req.stock_status, req.quantity, req.price),
        )
    conn.commit()
    conn.close()
    log_audit_event(admin["id"], "ADMIN_UPDATE_INVENTORY", "pharmacy_inventory", req.pharmacy_id, f"Med: {req.medicine_id}")
    return {"success": True, "message": "Inventory recorded."}


# ─── Medicines Management ───────────────────────────────────────────────────

@router.post("/medicines")
async def admin_create_medicine(
    req: CreateMedicineRequest,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    med_id = f"med-{secrets.token_hex(4)}"
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO medicines (id, name, generic_name, strength, form, category, mrp_inr, jan_aushadhi_price_inr, manufacturer, description, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (
            med_id,
            req.name,
            req.generic_name,
            req.strength,
            req.form,
            req.category,
            req.mrp_inr,
            req.jan_aushadhi_price_inr,
            req.manufacturer,
            req.description,
        ),
    )
    conn.commit()
    conn.close()
    log_audit_event(admin["id"], "ADMIN_CREATE_MEDICINE", "medicines", med_id, req.name)
    return {"success": True, "id": med_id, "name": req.name}


# ─── Audit Logs ──────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def admin_get_audit_logs(admin: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100").fetchall()
    conn.close()
    return [dict(r) for r in rows]
