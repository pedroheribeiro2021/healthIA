"""Reprocessa raw_records pendentes/com erro a partir dos normalizers atuais.

Uso: uv run python -m app.normalization.reprocess
(ver docs/ARCHITECTURE.md — Normalization Engine, "Reprocessável")
"""

from sqlalchemy.engine import Engine

import app.normalization  # noqa: F401  registra os normalizers (efeito colateral de import)
from app.config import get_settings
from app.normalization.service import normalize_and_store
from app.repositories.sqlite.connection import make_engine
from app.repositories.sqlite.event_repository import SqliteEventRepository
from app.repositories.sqlite.migrations import run_migrations
from app.repositories.sqlite.raw_record_repository import SqliteRawRecordRepository


def reprocess_pending(engine: Engine) -> dict[str, int]:
    raw_repo = SqliteRawRecordRepository(engine)
    event_repo = SqliteEventRepository(engine)

    result = {"processed": 0, "failed": 0}
    for raw in raw_repo.list_pending():
        try:
            normalize_and_store(raw, event_repo, raw_repo)
            result["processed"] += 1
        except Exception:
            result["failed"] += 1
    return result


def main() -> None:
    settings = get_settings()
    run_migrations(settings.db_path)
    engine = make_engine(settings.db_path)
    result = reprocess_pending(engine)
    print(f"Reprocessados: {result['processed']} | falhas: {result['failed']}")


if __name__ == "__main__":
    main()
