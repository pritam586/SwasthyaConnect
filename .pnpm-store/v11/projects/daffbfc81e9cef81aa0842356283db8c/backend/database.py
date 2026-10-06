"""Database schema, connection pool, and migrations for SwasthyaConnect.

Manages persistent storage with WAL mode, foreign key constraints,
comprehensive performance indexes, and strict data integrity.
"""

from __future__ import annotations

import json
import logging
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("swasthya.database")

DB_PATH = Path(os.getenv("SWASTHYA_DB_PATH", "swasthya_connect.db"))


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db() -> None:
    """Initialize database tables, schemas, indexes, and directory seed data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    def ensure_columns(tbl: str, cols: dict[str, str]) -> None:
        try:
            cur = cursor.execute(f"PRAGMA table_info({tbl});")
            existing = {row[1] for row in cur.fetchall()}
            for col, col_def in cols.items():
                if col not in existing:
                    # SQLite does not allow non-constant defaults like CURRENT_TIMESTAMP in ALTER TABLE ADD COLUMN
                    safe_def = col_def
                    if "CURRENT_TIMESTAMP" in safe_def.upper():
                        safe_def = safe_def.split("DEFAULT")[0].strip()
                    cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {safe_def};")
        except Exception as e:
            logger.warning(f"Column check notice for {tbl}: {e}")

    # 1. Users table (Patients, Doctors, Admins)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'PATIENT', -- 'PATIENT', 'DOCTOR', 'ADMIN'
            phone_verified BOOLEAN DEFAULT 0,
            email_verified BOOLEAN DEFAULT 0,
            profile_completed BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            age INTEGER,
            gender TEXT,
            location TEXT,
            abha_id TEXT,
            pmjay_eligible BOOLEAN DEFAULT 0,
            last_login_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_columns("users", {
        "email": "TEXT",
        "phone_verified": "BOOLEAN DEFAULT 0",
        "email_verified": "BOOLEAN DEFAULT 0",
        "profile_completed": "BOOLEAN DEFAULT 0",
        "is_active": "BOOLEAN DEFAULT 1",
        "last_login_at": "TIMESTAMP",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    })

    # 2. Refresh Tokens Table (Dual JWT architecture)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at REAL NOT NULL,
            revoked BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )

    # 3. Patient Profiles table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS patient_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            date_of_birth TEXT,
            gender TEXT,
            blood_group TEXT,
            address TEXT,
            location TEXT,
            emergency_contact TEXT,
            allergies TEXT,
            chronic_conditions TEXT,
            medical_history TEXT,
            abha_id TEXT,
            pmjay_eligible BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )
    ensure_columns("patient_profiles", {
        "date_of_birth": "TEXT",
        "blood_group": "TEXT",
        "address": "TEXT",
        "location": "TEXT",
        "emergency_contact": "TEXT",
        "allergies": "TEXT",
        "chronic_conditions": "TEXT",
        "medical_history": "TEXT",
        "abha_id": "TEXT",
        "pmjay_eligible": "BOOLEAN DEFAULT 0",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    })

    # 4. Doctors table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS doctors (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            specialization TEXT NOT NULL,
            qualification TEXT NOT NULL,
            experience_years INTEGER DEFAULT 0,
            license_number TEXT,
            clinic_name TEXT,
            location TEXT,
            availability_json TEXT,
            consultation_fee REAL DEFAULT 0.0,
            profile_image_url TEXT,
            rating REAL DEFAULT 4.8,
            verification_status TEXT DEFAULT 'VERIFIED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )
    ensure_columns("doctors", {
        "verification_status": "TEXT DEFAULT 'VERIFIED'",
        "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    })

    # 5. Doctor Availabilities table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS doctor_availabilities (
            id TEXT PRIMARY KEY,
            doctor_id TEXT NOT NULL,
            day_of_week TEXT NOT NULL, -- Monday, Tuesday, etc.
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
        )
        """
    )

    # 6. Current Medications table (Strictly patient-specific)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS medications (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            medicine_name TEXT NOT NULL,
            generic_name TEXT,
            dosage TEXT,
            frequency TEXT,
            route TEXT DEFAULT 'Oral',
            start_date TEXT,
            end_date TEXT,
            prescribed_by TEXT,
            prescription_id TEXT,
            status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'STOPPED'
            instructions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )

    # 7. Health Encounters table (Strictly patient-specific)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS health_encounters (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            doctor_id TEXT,
            doctor_name TEXT,
            encounter_date TEXT NOT NULL,
            reason TEXT NOT NULL,
            symptoms TEXT,
            diagnosis_notes TEXT,
            treatment_notes TEXT,
            prescription_id TEXT,
            consultation_id TEXT,
            status TEXT DEFAULT 'COMPLETED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )

    # 8. Medical Reports table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS medical_reports (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            user_id TEXT, -- legacy alias
            patient_name TEXT,
            uploaded_by TEXT NOT NULL,
            report_title TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT,
            file_url TEXT,
            file_type TEXT NOT NULL,
            original_file_name TEXT,
            report_date TEXT,
            report_type TEXT DEFAULT 'Diagnostic Pathology / Lab',
            extracted_text TEXT,
            extracted_medicines_json TEXT,
            ai_summary TEXT,
            processing_status TEXT DEFAULT 'PROCESSED',
            ai_analysis_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )

    # 9. Prescriptions table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS prescriptions (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            doctor_id TEXT NOT NULL,
            doctor_name TEXT NOT NULL,
            appointment_id TEXT,
            consultation_id TEXT,
            diagnosis TEXT,
            medicines_json TEXT NOT NULL,
            instructions TEXT,
            prescription_date TEXT NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )
    ensure_columns("prescriptions", {
        "appointment_id": "TEXT",
        "diagnosis": "TEXT",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    })

    # 10. Appointments table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            doctor_id TEXT NOT NULL,
            patient_name TEXT NOT NULL,
            doctor_name TEXT NOT NULL,
            slot_date TEXT NOT NULL,
            slot_time TEXT NOT NULL,
            status TEXT DEFAULT 'REQUESTED', -- 'REQUESTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )
    ensure_columns("appointments", {
        "status": "TEXT DEFAULT 'REQUESTED'",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    })

    # 11. AI Analyses & Screenings table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_analyses (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            image_url TEXT,
            model_version TEXT DEFAULT 'MobileNetV3-v1',
            input_type TEXT DEFAULT 'palpebral_conjunctiva',
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            triage_level TEXT, -- 'GREEN', 'YELLOW', 'RED'
            quality_passed BOOLEAN DEFAULT 1,
            quality_reason TEXT,
            grad_cam_url TEXT,
            explanation TEXT,
            disclaimer TEXT NOT NULL,
            status TEXT DEFAULT 'COMPLETED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )
    ensure_columns("ai_analyses", {
        "status": "TEXT DEFAULT 'COMPLETED'",
    })

    # 12. Triage Cases (Clinician Queue)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS triage_cases (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            patient_name TEXT NOT NULL,
            age TEXT,
            gender TEXT,
            phone TEXT,
            location TEXT,
            abha_id TEXT,
            pmjay_eligible BOOLEAN DEFAULT 0,
            visual_confidence REAL DEFAULT 0.0,
            symptoms_json TEXT NOT NULL,
            ai_summary TEXT NOT NULL,
            urgency TEXT NOT NULL, -- 'green', 'yellow', 'red'
            doctor_id TEXT,
            diagnosis TEXT,
            rx_notes TEXT,
            rx_medicines_json TEXT,
            status TEXT DEFAULT 'pending', -- 'pending' or 'reviewed'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )

    # 13. Pharmacies directory
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS pharmacies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            phone TEXT,
            is_jan_aushadhi BOOLEAN DEFAULT 0,
            open_hours TEXT DEFAULT '8:00 AM - 9:30 PM',
            rating REAL DEFAULT 4.6,
            verified BOOLEAN DEFAULT 1,
            active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # 14. Medicines catalogue
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS medicines (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            generic_name TEXT NOT NULL,
            strength TEXT NOT NULL,
            form TEXT DEFAULT 'Tablet', -- Tablet, Syrup, Capsule, Drops
            category TEXT NOT NULL, -- Iron Supplement, Vitamin, Antibiotic, Analgesic
            mrp_inr REAL DEFAULT 0.0,
            jan_aushadhi_price_inr REAL DEFAULT 0.0,
            manufacturer TEXT,
            description TEXT,
            active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # 15. Pharmacy Inventory table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS pharmacy_inventory (
            id TEXT PRIMARY KEY,
            pharmacy_id TEXT NOT NULL,
            medicine_id TEXT NOT NULL,
            stock_status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'
            quantity INTEGER DEFAULT 0,
            price REAL DEFAULT 0.0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pharmacy_id) REFERENCES pharmacies (id) ON DELETE CASCADE,
            FOREIGN KEY (medicine_id) REFERENCES medicines (id) ON DELETE CASCADE
        )
        """
    )

    # 16. Notifications table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'INFO', -- 'APPOINTMENT', 'PRESCRIPTION', 'REPORT', 'AI_ANALYSIS', 'SYSTEM'
            is_read BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    )

    # 17. OTP Verifications table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS otp_verifications (
            phone TEXT PRIMARY KEY,
            otp_code TEXT NOT NULL,
            expires_at REAL NOT NULL,
            verified BOOLEAN DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # 18. Audit Logs table (HIPAA & Security Compliance)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            ip_address TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # 19. Indexes for Query Performance & Relational Integrity
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);",
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_patient_profiles_user ON patient_profiles(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);",
        "CREATE INDEX IF NOT EXISTS idx_encounters_patient ON health_encounters(patient_id);",
        "CREATE INDEX IF NOT EXISTS idx_reports_patient ON medical_reports(patient_id);",
        "CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);",
        "CREATE INDEX IF NOT EXISTS idx_ai_analyses_patient ON ai_analyses(patient_id);",
        "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_pharmacy_coords ON pharmacies(latitude, longitude);",
        "CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name, generic_name);",
        "CREATE INDEX IF NOT EXISTS idx_inventory_lookup ON pharmacy_inventory(pharmacy_id, medicine_id);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);",
    ]
    for idx_sql in indexes:
        cursor.execute(idx_sql)

    conn.commit()
    conn.close()


def seed_directory_data_if_empty() -> None:
    """Seed baseline medicines, pharmacies, and demo clinicians/admin for development."""
    from backend.crypto_utils import hash_password

    conn = get_db_connection()
    cursor = conn.cursor()

    # Seed Default Doctor if not exists
    cursor.execute("SELECT id FROM users WHERE phone = '9876543210' LIMIT 1")
    if not cursor.fetchone():
        doc_hash = hash_password("doctor123")
        cursor.execute(
            """
            INSERT INTO users (id, name, email, phone, password_hash, role, phone_verified, profile_completed, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "doc-001",
                "Dr. Anjali Verma",
                "anjali.verma@phc.mohfw.gov.in",
                "9876543210",
                doc_hash,
                "DOCTOR",
                1,
                1,
                "District Hospital Hapur / Pune Clinic",
            ),
        )
        cursor.execute(
            """
            INSERT OR IGNORE INTO doctors (id, user_id, name, specialization, qualification, experience_years, license_number, clinic_name, location, availability_json, consultation_fee, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "doc-001",
                "doc-001",
                "Dr. Anjali Verma",
                "Community Health & General Medicine",
                "MBBS, MD (Community Medicine)",
                12,
                "MCI-2012-44821",
                "Community Health Centre (CHC)",
                "Pune / Hapur Block",
                json.dumps(["09:30 AM", "11:00 AM", "02:00 PM", "04:30 PM"]),
                0.0,
                4.9,
            ),
        )

    # Seed Default Admin if not exists
    cursor.execute("SELECT id FROM users WHERE phone = '9999999999' LIMIT 1")
    if not cursor.fetchone():
        admin_hash = hash_password("admin123")
        cursor.execute(
            """
            INSERT INTO users (id, name, email, phone, password_hash, role, phone_verified, profile_completed, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "admin-001",
                "Chief Medical Admin",
                "admin@swasthyaconnect.nic.in",
                "9999999999",
                admin_hash,
                "ADMIN",
                1,
                1,
                "State Telehealth Directorate",
            ),
        )

    # Seed Medicines catalogue (standard generic essential medicines)
    cursor.execute("SELECT id FROM medicines LIMIT 1")
    if not cursor.fetchone():
        seed_medicines = [
            ("med-01", "Ferrous Sulfate 200mg", "Ferrous Sulfate", "200 mg", "Tablet", "Iron Supplement", 45.0, 8.5, "Indian Pharmacopoeia", "First-line oral iron therapy for iron deficiency anaemia"),
            ("med-02", "Folic Acid 5mg", "Folic Acid", "5 mg", "Tablet", "Vitamin", 30.0, 4.0, "State Pharma", "Essential B-vitamin for red blood cell maturation"),
            ("med-03", "Vitamin C (Ascorbic Acid) 500mg", "Ascorbic Acid", "500 mg", "Chewable Tablet", "Vitamin", 55.0, 11.0, "State Pharma", "Promotes gastrointestinal iron absorption"),
            ("med-04", "Paracetamol 500mg", "Paracetamol", "500 mg", "Tablet", "Analgesic / Antipyretic", 25.0, 5.0, "Generic India", "Fever and mild pain relief"),
            ("med-05", "Amoxicillin 500mg", "Amoxicillin", "500 mg", "Capsule", "Antibiotic", 90.0, 22.0, "Cipla Ltd", "Broad-spectrum penicillin antibiotic"),
            ("med-06", "Albendazole 400mg", "Albendazole", "400 mg", "Chewable Tablet", "Anthelmintic", 18.0, 3.5, "Government Supply", "Deworming tablet for parasitic anaemia prevention"),
            ("med-07", "Iron Folic Acid Syrup (IFA)", "Iron + Folic Acid", "100 ml", "Syrup", "Iron Supplement", 60.0, 14.0, "National Health Mission", "Paediatric and adolescent liquid iron formulation"),
            ("med-08", "Calcium + Vitamin D3", "Calcium Carbonate + D3", "500 mg + 250 IU", "Tablet", "Mineral", 80.0, 18.0, "Zydus Healthcare", "Bone health and prenatal nutritional support"),
        ]
        cursor.executemany(
            """
            INSERT INTO medicines (id, name, generic_name, strength, form, category, mrp_inr, jan_aushadhi_price_inr, manufacturer, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            seed_medicines,
        )

    # Seed Pharmacies
    cursor.execute("SELECT id FROM pharmacies LIMIT 1")
    if not cursor.fetchone():
        seed_pharmacies = [
            (
                "pharma-01",
                "Pradhan Mantri Jan Aushadhi Kendra #1042",
                "Near Community Health Centre, Main Bazaar, Hapur",
                28.7298,
                77.7760,
                "+91 94123 45678",
                1,
                "8:00 AM - 9:00 PM",
                4.8,
                1,
            ),
            (
                "pharma-02",
                "Apollo Pharmacy Rural Branch",
                "Opposite Bus Stand, Station Road, Hapur",
                28.7325,
                77.7812,
                "+91 98765 12345",
                0,
                "24 Hours Open",
                4.5,
                1,
            ),
            (
                "pharma-03",
                "Jan Aushadhi Kendra Shiv Mandir",
                "Shiv Mandir Marg, District Hospital Gate, Meerut",
                28.9845,
                77.7064,
                "+91 98112 33445",
                1,
                "8:30 AM - 9:30 PM",
                4.9,
                1,
            ),
            (
                "pharma-04",
                "MedPlus Primary Health Chemist",
                "Kalyan Nagar, Near PHC, Pune",
                18.5204,
                73.8567,
                "+91 99220 11223",
                0,
                "7:30 AM - 11:00 PM",
                4.3,
                1,
            ),
            (
                "pharma-05",
                "Pradhan Mantri Bhartiya Janaushadhi Pariyojana #3310",
                "Shivajinagar Bus Terminal, Pune",
                18.5314,
                73.8446,
                "+91 98230 44556",
                1,
                "8:00 AM - 10:00 PM",
                4.7,
                1,
            ),
        ]
        cursor.executemany(
            """
            INSERT INTO pharmacies (id, name, address, latitude, longitude, phone, is_jan_aushadhi, open_hours, rating, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            seed_pharmacies,
        )

    # Seed Pharmacy Inventory (confirmed stocks for essential medicines)
    cursor.execute("SELECT id FROM pharmacy_inventory LIMIT 1")
    if not cursor.fetchone():
        seed_inventory = [
            ("inv-01", "pharma-01", "med-01", "AVAILABLE", 140, 8.5),
            ("inv-02", "pharma-01", "med-02", "AVAILABLE", 95, 4.0),
            ("inv-03", "pharma-01", "med-03", "AVAILABLE", 60, 11.0),
            ("inv-04", "pharma-01", "med-04", "AVAILABLE", 220, 5.0),
            ("inv-05", "pharma-02", "med-01", "AVAILABLE", 45, 45.0),
            ("inv-06", "pharma-02", "med-04", "AVAILABLE", 80, 25.0),
            ("inv-07", "pharma-03", "med-01", "AVAILABLE", 180, 8.5),
            ("inv-08", "pharma-03", "med-02", "AVAILABLE", 120, 4.0),
            ("inv-09", "pharma-04", "med-04", "AVAILABLE", 110, 25.0),
            ("inv-10", "pharma-05", "med-01", "AVAILABLE", 160, 8.5),
            ("inv-11", "pharma-05", "med-02", "AVAILABLE", 130, 4.0),
            ("inv-12", "pharma-05", "med-03", "AVAILABLE", 85, 11.0),
        ]
        cursor.executemany(
            """
            INSERT INTO pharmacy_inventory (id, pharmacy_id, medicine_id, stock_status, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            seed_inventory,
        )

    conn.commit()
    conn.close()


init_db()
