from datetime import UTC, datetime
from pathlib import Path

from app.domain.models import HealthEvent
from app.repositories.sqlite.connection import make_engine
from app.repositories.sqlite.event_repository import SqliteEventRepository
from app.repositories.sqlite.migrations import run_migrations


def test_add_and_list_events(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    engine = make_engine(db_path)
    repo = SqliteEventRepository(engine)

    event = HealthEvent(
        event_type="weight",
        start_time=datetime(2026, 7, 18, 12, 0, tzinfo=UTC),
        value=82.5,
        unit="kg",
        source="manual",
    )
    saved = repo.add(event)

    assert saved.id is not None
    assert saved.created_at is not None

    events = repo.list_by_type(
        "weight",
        start=datetime(2026, 7, 18, tzinfo=UTC),
        end=datetime(2026, 7, 19, tzinfo=UTC),
    )

    assert len(events) == 1
    assert events[0].value == 82.5
    assert events[0].unit == "kg"


def test_list_by_type_filters_other_types_and_periods(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    engine = make_engine(db_path)
    repo = SqliteEventRepository(engine)

    repo.add(
        HealthEvent(
            event_type="weight",
            start_time=datetime(2026, 7, 10, tzinfo=UTC),
            value=83.0,
            unit="kg",
            source="manual",
        )
    )
    repo.add(
        HealthEvent(
            event_type="hydration",
            start_time=datetime(2026, 7, 18, tzinfo=UTC),
            value=1.5,
            unit="l",
            source="manual",
        )
    )

    events = repo.list_by_type(
        "weight",
        start=datetime(2026, 7, 18, tzinfo=UTC),
        end=datetime(2026, 7, 19, tzinfo=UTC),
    )

    assert events == []
