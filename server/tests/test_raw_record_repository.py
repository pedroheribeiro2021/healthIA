from pathlib import Path

from app.domain.models import RawRecordInput
from app.repositories.sqlite.connection import make_engine
from app.repositories.sqlite.migrations import run_migrations
from app.repositories.sqlite.raw_record_repository import SqliteRawRecordRepository


def _repo(tmp_path: Path) -> SqliteRawRecordRepository:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    return SqliteRawRecordRepository(make_engine(db_path))


def test_add_creates_pending_record(tmp_path: Path) -> None:
    repo = _repo(tmp_path)

    record, is_duplicate = repo.add(
        RawRecordInput(
            source="manual",
            record_type="weight",
            payload={"occurred_at": "2026-07-18T12:00:00+00:00", "value_kg": 82.5},
        )
    )

    assert not is_duplicate
    assert record.id is not None
    assert record.norm_status == "pending"
    assert record.payload["value_kg"] == 82.5


def test_add_same_payload_twice_is_deduplicated(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    payload = {"occurred_at": "2026-07-18T12:00:00+00:00", "value_kg": 82.5}

    first, first_duplicate = repo.add(
        RawRecordInput(source="manual", record_type="weight", payload=payload)
    )
    second, second_duplicate = repo.add(
        RawRecordInput(source="manual", record_type="weight", payload=payload)
    )

    assert not first_duplicate
    assert second_duplicate
    assert second.id == first.id


def test_mark_normalized_updates_status(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    record, _ = repo.add(
        RawRecordInput(
            source="manual",
            record_type="note",
            payload={"occurred_at": "2026-07-18T12:00:00+00:00", "text": "teste"},
        )
    )

    repo.mark_normalized(record.id, "done")

    found = repo._find_by_hash(record.payload_hash)
    assert found is not None
    assert found.norm_status == "done"
    assert found.norm_error is None
