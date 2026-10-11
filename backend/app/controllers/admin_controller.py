"""/api/v1/admin: administrator-only management."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import require_admin
from app.models import User
from app.schemas.admin import DoctorVerificationUpdate, InventoryUpsert, MedicineCreate, PharmacyCreate, UserStatusUpdate
from app.schemas.common import ApiModel, Message, OrmModel
from app.schemas.doctor import DoctorSelfOut
from app.schemas.pharmacy import MedicineOut
from app.services import admin_service, doctor_service

router = APIRouter(tags=["admin"])


class PharmacyAdminOut(OrmModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    phone: str | None
    is_jan_aushadhi: bool
    open_hours: str | None
    active: bool


class AuditLogOut(OrmModel):
    id: str
    user_id: str | None
    action: str
    resource_type: str
    resource_id: str | None
    created_at: datetime


class InventoryOut(ApiModel):
    id: str
    pharmacy_id: str
    medicine_id: str
    stock_status: str
    quantity: int
    price_inr: float | None


@router.get("/stats")
def stats(_admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    return admin_service.stats(db)


@router.get("/users")
def users(_admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    return admin_service.list_users(db)


@router.patch("/users/{user_id}/status", response_model=Message)
def set_user_status(user_id: str, req: UserStatusUpdate, admin: User = Depends(require_admin),
                    db: Session = Depends(get_db)) -> Message:
    admin_service.set_user_active(db, admin, user_id, req.is_active)
    return Message(message="Account status updated.")


@router.get("/doctors", response_model=list[DoctorSelfOut])
def doctors(
    verification: Literal["PENDING", "VERIFIED", "REJECTED"] | None = Query(default=None),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return [doctor_service.self_out(d) for d in admin_service.list_doctors(db, verification)]


@router.patch("/doctors/{doctor_id}/verification", response_model=DoctorSelfOut)
def verify_doctor(doctor_id: str, req: DoctorVerificationUpdate, admin: User = Depends(require_admin),
                  db: Session = Depends(get_db)) -> DoctorSelfOut:
    return doctor_service.self_out(admin_service.set_doctor_verification(db, admin, doctor_id, req.status))


@router.get("/pharmacies", response_model=list[PharmacyAdminOut])
def pharmacies(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.list_pharmacies(db)


@router.post("/pharmacies", response_model=PharmacyAdminOut, status_code=status.HTTP_201_CREATED)
def create_pharmacy(req: PharmacyCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.create_pharmacy(db, admin, req)


@router.post("/medicines", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(req: MedicineCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.create_medicine(db, admin, req)


@router.put("/inventory", response_model=InventoryOut)
def upsert_inventory(req: InventoryUpsert, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> InventoryOut:
    row = admin_service.upsert_inventory(db, admin, req)
    return InventoryOut(id=row.id, pharmacy_id=row.pharmacy_id, medicine_id=row.medicine_id,
                        stock_status=row.stock_status, quantity=row.quantity, price_inr=row.price_inr)


@router.get("/audit-logs", response_model=list[AuditLogOut])
def audit_logs(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.audit_logs(db)
