from datetime import UTC, datetime
from pathlib import Path

from app.domain.models import RawRecordInput
from app.normalization.reprocess import reprocess_pending
from app.repositories.sqlite.connection import make_engine
from app.repositories.sqlite.event_repository import SqliteEventRepository
from app.repositories.sqlite.migrations import run_migrations
from app.repositories.sqlite.raw_record_repository import SqliteRawRecordRepository


def test_reprocess_normalizes_pending_records(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    engine = make_engine(db_path)
    raw_repo = SqliteRawRecordRepository(engine)

    raw, _ = raw_repo.add(
        RawRecordInput(
            source="manual",
            record_type="weight",
            payload={"occurred_at": "2026-07-18T12:00:00+00:00", "value_kg": 80.0},
        )
    )
    assert raw.norm_status == "pending"

    result = reprocess_pending(engine)

    assert result == {"processed": 1, "failed": 0}
    assert raw_repo.get(raw.id).norm_status == "done"

    events = SqliteEventRepository(engine).list_by_type(
        "weight",
        start=datetime(2026, 7, 18, tzinfo=UTC),
        end=datetime(2026, 7, 19, tzinfo=UTC),
    )
    assert len(events) == 1
    assert events[0].value == 80.0


def test_reprocess_marks_unknown_record_type_as_failed(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    engine = make_engine(db_path)
    raw_repo = SqliteRawRecordRepository(engine)

    raw, _ = raw_repo.add(
        RawRecordInput(
            source="manual",
            record_type="unknown",
            payload={"occurred_at": "2026-07-18T12:00:00+00:00"},
        )
    )

    result = reprocess_pending(engine)

    assert result == {"processed": 0, "failed": 1}
    updated = raw_repo.get(raw.id)
    assert updated.norm_status == "error"
    assert updated.norm_error is not None


def test_reprocess_skips_already_done_records(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    engine = make_engine(db_path)
    raw_repo = SqliteRawRecordRepository(engine)

    raw, _ = raw_repo.add(
        RawRecordInput(
            source="manual",
            record_type="weight",
            payload={"occurred_at": "2026-07-18T12:00:00+00:00", "value_kg": 80.0},
        )
    )
    raw_repo.mark_normalized(raw.id, "done")

    result = reprocess_pending(engine)

    assert result == {"processed": 0, "failed": 0}
