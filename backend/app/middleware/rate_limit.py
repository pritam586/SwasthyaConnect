"""Per-client rate limit for authentication endpoints (brute-force and OTP abuse protection).

In-memory, so the limit is per running instance. That is enough for one Render instance;
a multi-instance deployment would need a shared store such as Redis.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request

from app.config.settings import get_settings
from app.utils.errors import RateLimitedError

_WINDOW_SECONDS = 60.0
_hits: dict[str, deque[float]] = defaultdict(deque)


def client_ip(request: Request) -> str:
    # Render and Vercel put the real client first in X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def auth_rate_limit(request: Request) -> None:
    limit = get_settings().auth_rate_limit_per_minute
    if limit <= 0:
        return
    key = f"{client_ip(request)}:{request.url.path}"
    now = time.monotonic()
    window = _hits[key]
    while window and now - window[0] > _WINDOW_SECONDS:
        window.popleft()
    if len(window) >= limit:
        raise RateLimitedError("Too many attempts. Please wait a minute and try again.")
    window.append(now)


def reset_rate_limits() -> None:
    _hits.clear()
