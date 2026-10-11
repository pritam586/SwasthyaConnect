"""Text extraction from uploaded reports."""

from __future__ import annotations

import io
import logging
import re

logger = logging.getLogger("swasthya.documents")


def extract_pdf_text(content: bytes, max_chars: int = 20_000) -> str:
    """Text layer of a PDF. Scanned PDFs have none (OCR is not implemented)."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        parts = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(parts).strip()[:max_chars]
    except Exception:  # pypdf raises many error types for malformed files
        logger.warning("Could not read text from an uploaded PDF")
        return ""


def safe_file_name(name: str | None, default: str = "upload") -> str:
    cleaned = re.sub(r"[^\w.\- ]", "_", (name or "").strip())[:200]
    return cleaned or default
