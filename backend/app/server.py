"""Production entry point: `python -m app.server`.

Binds to the port the host assigns ($PORT on Render). Uvicorn handles SIGTERM by finishing
in-flight requests before exiting, and the app lifespan then closes database connections.
"""

from __future__ import annotations

import os

import uvicorn


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        proxy_headers=True,
        forwarded_allow_ips="*",
        timeout_graceful_shutdown=20,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )


if __name__ == "__main__":
    main()
