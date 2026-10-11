"""Development-only demo data: one verified doctor, one admin, a medicine catalogue and pharmacies.

    python -m scripts.seed_demo

Refuses to run when ENVIRONMENT=production. The pharmacies and stock levels are illustrative,
not a real dataset: load real data in production with scripts/import_pharmacies.py.
Demo passwords come from DEMO_DOCTOR_PASSWORD / DEMO_ADMIN_PASSWORD (defaults in .env.example).
"""

from __future__ import annotations

import os
import sys
from datetime import time

from sqlalchemy import select

from app.config.database import SessionLocal
from app.config.settings import get_settings
from app.constants import DoctorVerification, Role
from app.models import Doctor, DoctorAvailability, Medicine, Pharmacy, PharmacyInventory, User, new_id
from app.utils.security import hash_password

MEDICINES = [
    ("Ferrous Sulfate 200mg", "Ferrous Sulfate", "200 mg", "Tablet", "Iron supplement", 45.0, 8.5),
    ("Folic Acid 5mg", "Folic Acid", "5 mg", "Tablet", "Vitamin", 30.0, 4.0),
    ("Vitamin C 500mg", "Ascorbic Acid", "500 mg", "Chewable tablet", "Vitamin", 55.0, 11.0),
    ("Paracetamol 500mg", "Paracetamol", "500 mg", "Tablet", "Analgesic", 25.0, 5.0),
    ("Amoxicillin 500mg", "Amoxicillin", "500 mg", "Capsule", "Antibiotic", 90.0, 22.0),
    ("Albendazole 400mg", "Albendazole", "400 mg", "Chewable tablet", "Anthelmintic", 18.0, 3.5),
    ("Iron Folic Acid Syrup", "Iron + Folic Acid", "100 ml", "Syrup", "Iron supplement", 60.0, 14.0),
    ("Calcium + Vitamin D3", "Calcium Carbonate + Vitamin D3", "500 mg + 250 IU", "Tablet", "Mineral", 80.0, 18.0),
]

PHARMACIES = [
    ("Demo Jan Aushadhi Kendra, Hapur", "Main Bazaar, Hapur", 28.7298, 77.7760, True, ["Ferrous Sulfate 200mg", "Folic Acid 5mg", "Vitamin C 500mg", "Paracetamol 500mg"]),
    ("Demo Rural Pharmacy, Hapur", "Station Road, Hapur", 28.7325, 77.7812, False, ["Ferrous Sulfate 200mg", "Paracetamol 500mg"]),
    ("Demo Jan Aushadhi Kendra, Meerut", "District Hospital Gate, Meerut", 28.9845, 77.7064, True, ["Ferrous Sulfate 200mg", "Folic Acid 5mg"]),
    ("Demo Primary Health Chemist, Pune", "Kalyan Nagar, Pune", 18.5204, 73.8567, False, ["Paracetamol 500mg"]),
    ("Demo Jan Aushadhi Kendra, Pune", "Shivajinagar, Pune", 18.5314, 73.8446, True, ["Ferrous Sulfate 200mg", "Folic Acid 5mg", "Vitamin C 500mg"]),
]


def main() -> None:
    if get_settings().is_production:
        sys.exit("Refusing to seed demo data in production.")
    doctor_password = os.getenv("DEMO_DOCTOR_PASSWORD", "doctor123")
    admin_password = os.getenv("DEMO_ADMIN_PASSWORD", "admin123")

    with SessionLocal() as db:
        if not db.scalar(select(User.id).where(User.phone == "9876543210")):
            user = User(id=new_id("usr"), name="Dr. Demo Doctor", phone="9876543210", email="doctor@example.com",
                        password_hash=hash_password(doctor_password), role=Role.DOCTOR, phone_verified=True,
                        location="Pune")
            user.doctor_profile = Doctor(
                id=new_id("doc"), name=user.name, specialization="General Medicine", qualification="MBBS",
                experience_years=10, license_number="DEMO-0001", clinic_name="Demo Primary Health Centre",
                location="Pune", verification_status=DoctorVerification.VERIFIED,
                availability=[DoctorAvailability(id=new_id("avl"), day_of_week=day, start_time=time(9, 0),
                                                 end_time=time(17, 0)) for day in range(6)],
            )
            db.add(user)
            print("Created demo doctor (phone 9876543210).")

        if not db.scalar(select(User.id).where(User.phone == "9999999999")):
            db.add(User(id=new_id("usr"), name="Demo Admin", phone="9999999999", email="admin@example.com",
                        password_hash=hash_password(admin_password), role=Role.ADMIN, phone_verified=True))
            print("Created demo admin (phone 9999999999).")

        medicines = {m.name: m for m in db.scalars(select(Medicine))}
        for name, generic, strength, form, category, mrp, ja_price in MEDICINES:
            if name not in medicines:
                medicines[name] = Medicine(id=new_id("mdc"), name=name, generic_name=generic, strength=strength,
                                           form=form, category=category, mrp_inr=mrp, jan_aushadhi_price_inr=ja_price)
                db.add(medicines[name])

        existing = set(db.scalars(select(Pharmacy.name)))
        for name, address, lat, lon, jan_aushadhi, stocked in PHARMACIES:
            if name in existing:
                continue
            pharmacy = Pharmacy(id=new_id("phm"), name=name, address=address, latitude=lat, longitude=lon,
                                is_jan_aushadhi=jan_aushadhi, open_hours="8:00 AM - 9:00 PM")
            for medicine_name in stocked:
                medicine = medicines[medicine_name]
                price = medicine.jan_aushadhi_price_inr if jan_aushadhi else medicine.mrp_inr
                pharmacy.inventory.append(PharmacyInventory(id=new_id("inv"), medicine=medicine,
                                                            stock_status="AVAILABLE", quantity=100, price_inr=price))
            db.add(pharmacy)
        db.commit()
    print("Demo data ready.")


if __name__ == "__main__":
    main()
