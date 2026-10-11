"""Create the first administrator account (production-safe; nothing is seeded automatically).

    python -m scripts.create_admin --name "Admin Name" --phone 9XXXXXXXXX --email admin@example.org

The password is read from the ADMIN_PASSWORD environment variable or prompted for, so it
never appears in shell history or logs.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from sqlalchemy import or_, select

from app.config.database import SessionLocal
from app.constants import Role
from app.models import User, new_id
from app.utils.phone import normalize_phone
from app.utils.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--phone", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    phone = normalize_phone(args.phone)
    if phone is None:
        sys.exit("Enter a valid 10-digit Indian mobile number.")
    password = os.getenv("ADMIN_PASSWORD") or getpass.getpass("Admin password (min 12 characters): ")
    if len(password) < 12:
        sys.exit("Use a password of at least 12 characters.")

    with SessionLocal() as db:
        if db.scalar(select(User.id).where(or_(User.phone == phone, User.email == args.email.lower()))):
            sys.exit("An account with this phone or email already exists.")
        db.add(User(id=new_id("usr"), name=args.name, phone=phone, email=args.email.lower(),
                    password_hash=hash_password(password), role=Role.ADMIN, phone_verified=True))
        db.commit()
    print("Administrator created.")


if __name__ == "__main__":
    main()
