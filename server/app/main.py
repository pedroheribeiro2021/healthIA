from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

import app.normalization  # noqa: F401  registra os normalizers (efeito colateral de import)
from app.api.events import router as events_router
from app.api.health import router as health_router
from app.config import get_settings
from app.repositories.sqlite.connection import make_engine
from app.repositories.sqlite.migrations import run_migrations


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    run_migrations(settings.db_path)
    app.state.engine = make_engine(settings.db_path)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="HealthAI", lifespan=lifespan)
    app.include_router(health_router)
    app.include_router(events_router)
    return app


app = create_app()
