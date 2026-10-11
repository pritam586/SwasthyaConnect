"""/api/v1/pharmacies and /api/v1/medicines: pharmacy search and the medicine catalogue."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.middleware.auth import get_current_user
from app.models import User
from app.schemas.pharmacy import MedicineOut, PharmacyResult, PharmacySearchRequest
from app.services import pharmacy_service

pharmacy_router = APIRouter(tags=["pharmacies"])
medicine_router = APIRouter(tags=["medicines"])


@pharmacy_router.post("/search", response_model=list[PharmacyResult])
def search_pharmacies(req: PharmacySearchRequest, _user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> list[PharmacyResult]:
    return pharmacy_service.search(db, req)


@medicine_router.get("", response_model=list[MedicineOut])
def list_medicines(_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return pharmacy_service.all_medicines(db)


@medicine_router.get("/search", response_model=list[MedicineOut])
def search_medicines(q: str = Query(min_length=1, max_length=100), _user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    return pharmacy_service.search_medicines(db, q)
