"""Application factory. Server startup lives in app/server.py; schema changes in Alembic."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config.cors import configure_cors
from app.config.database import check_database_connection, engine
from app.config.settings import get_settings
from app.controllers import health_controller
from app.middleware.error_handler import register_error_handlers
from app.middleware.http import register_http_middleware
from app.routes import api_router

logger = logging.getLogger("swasthya")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Fail fast on startup if the database is unreachable, instead of serving 500s.
    check_database_connection()
    logger.info("SwasthyaConnect API started (%s)", get_settings().environment)
    yield
    engine.dispose()
    logger.info("SwasthyaConnect API stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    app = FastAPI(
        title="SwasthyaConnect API",
        version="3.0.0",
        lifespan=lifespan,
        # Interactive docs only outside production.
        docs_url=None if settings.is_production else "/api/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/api/openapi.json",
    )
    register_http_middleware(app)
    configure_cors(app, settings)
    register_error_handlers(app)
    app.include_router(health_controller.router)
    app.include_router(api_router)
    return app


app = create_app()
