"""Administration: doctor verification, account status, and the pharmacy dataset."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants import Role
from app.models import (
    Appointment,
    AuditLog,
    Doctor,
    Medicine,
    Pharmacy,
    PharmacyInventory,
    ScreeningResult,
    TriageCase,
    User,
    new_id,
)
from app.schemas.admin import InventoryUpsert, MedicineCreate, PharmacyCreate
from app.services import audit_service, notification_service
from app.utils.errors import AppError, ConflictError, NotFoundError


def stats(db: Session) -> dict:
    def count(model, *conditions) -> int:
        return db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0

    return {
        "patients": count(User, User.role == Role.PATIENT),
        "doctors": count(Doctor),
        "doctors_pending_verification": count(Doctor, Doctor.verification_status == "PENDING"),
        "pharmacies": count(Pharmacy),
        "medicines": count(Medicine),
        "appointments": count(Appointment),
        "triage_cases": count(TriageCase),
        "screenings": count(ScreeningResult),
    }


def list_users(db: Session, limit: int = 200) -> list[dict]:
    users = db.scalars(select(User).order_by(User.created_at.desc()).limit(limit))
    return [
        {"id": u.id, "name": u.name, "phone": u.phone, "email": u.email, "role": u.role, "is_active": u.is_active,
         "created_at": u.created_at, "last_login_at": u.last_login_at}
        for u in users
    ]


def set_user_active(db: Session, admin: User, user_id: str, is_active: bool) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found.")
    if user.id == admin.id:
        raise AppError("You cannot deactivate your own account.")
    user.is_active = is_active
    audit_service.record(db, admin.id, "USER_ACTIVATE" if is_active else "USER_DEACTIVATE", "users", user.id)
    db.commit()


def list_doctors(db: Session, status: str | None = None) -> list[Doctor]:
    query = select(Doctor).order_by(Doctor.created_at.desc())
    if status:
        query = query.where(Doctor.verification_status == status)
    return list(db.scalars(query))


def set_doctor_verification(db: Session, admin: User, doctor_id: str, status: str) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise NotFoundError("Doctor not found.")
    doctor.verification_status = status
    if status != "VERIFIED":
        doctor.is_online = False
    notification_service.notify(db, doctor.user_id, "Account verification",
                                f"Your doctor account status is now {status.lower()}.", "SYSTEM")
    audit_service.record(db, admin.id, f"DOCTOR_{status}", "doctors", doctor.id)
    db.commit()
    return doctor


def create_pharmacy(db: Session, admin: User, req: PharmacyCreate) -> Pharmacy:
    pharmacy = Pharmacy(id=new_id("phm"), **req.model_dump())
    db.add(pharmacy)
    audit_service.record(db, admin.id, "PHARMACY_CREATE", "pharmacies", pharmacy.id)
    db.commit()
    return pharmacy


def list_pharmacies(db: Session) -> list[Pharmacy]:
    return list(db.scalars(select(Pharmacy).order_by(Pharmacy.name)))


def create_medicine(db: Session, admin: User, req: MedicineCreate) -> Medicine:
    if db.scalar(select(Medicine.id).where(func.lower(Medicine.name) == req.name.strip().lower())):
        raise ConflictError("A medicine with this name already exists.")
    medicine = Medicine(id=new_id("mdc"), **req.model_dump())
    db.add(medicine)
    audit_service.record(db, admin.id, "MEDICINE_CREATE", "medicines", medicine.id)
    db.commit()
    return medicine


def upsert_inventory(db: Session, admin: User, req: InventoryUpsert) -> PharmacyInventory:
    if db.get(Pharmacy, req.pharmacy_id) is None or db.get(Medicine, req.medicine_id) is None:
        raise NotFoundError("Pharmacy or medicine not found.")
    row = db.scalar(
        select(PharmacyInventory).where(
            PharmacyInventory.pharmacy_id == req.pharmacy_id, PharmacyInventory.medicine_id == req.medicine_id
        )
    )
    if row is None:
        row = PharmacyInventory(id=new_id("inv"), pharmacy_id=req.pharmacy_id, medicine_id=req.medicine_id)
        db.add(row)
    row.stock_status = req.stock_status
    row.quantity = req.quantity
    row.price_inr = req.price_inr
    audit_service.record(db, admin.id, "INVENTORY_UPDATE", "pharmacy_inventory", row.id)
    db.commit()
    return row


def audit_logs(db: Session, limit: int = 200) -> list[AuditLog]:
    return list(db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)))
