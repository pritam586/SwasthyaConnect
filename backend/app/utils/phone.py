"""Indian mobile number normalisation: every phone is stored as its 10-digit national number."""

from __future__ import annotations

import re

_MOBILE = re.compile(r"^[6-9]\d{9}$")


def normalize_phone(raw: str) -> str | None:
    """'+91 98765-43210', '09876543210' and '9876543210' all become '9876543210'."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits if _MOBILE.match(digits) else None


def to_e164(phone: str) -> str:
    return f"+91{phone}"
