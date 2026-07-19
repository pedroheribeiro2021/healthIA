import sqlite3
from pathlib import Path

from sqlalchemy import inspect

from app.repositories.sqlite.connection import make_engine
from app.repositories.sqlite.migrations import run_migrations

EXPECTED_TABLES = {
    "raw_records",
    "health_events",
    "recipes",
    "recipe_ingredients",
    "foods",
    "shopping_list_items",
    "goals",
    "metric_snapshots",
    "insights",
    "recommendations",
    "daily_summary",
    "schema_version",
}


def test_run_migrations_creates_full_schema(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"

    applied = run_migrations(db_path)

    assert applied == [1]
    engine = make_engine(db_path)
    tables = set(inspect(engine).get_table_names())
    assert EXPECTED_TABLES.issubset(tables)


def test_run_migrations_is_idempotent(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"

    run_migrations(db_path)
    second_run = run_migrations(db_path)

    assert second_run == []


def test_raw_records_is_append_only(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO raw_records
                (source, record_type, payload, payload_hash, received_at)
            VALUES ('manual', 'Weight', '{}', 'hash1', '2026-07-19T00:00:00Z')
            """
        )
        conn.commit()

        try:
            conn.execute("DELETE FROM raw_records WHERE id = 1")
            conn.commit()
            raised = False
        except sqlite3.IntegrityError:
            raised = True

        assert raised
    finally:
        conn.close()


def test_health_events_reject_value_update(tmp_path: Path) -> None:
    db_path = tmp_path / "healthai.db"
    run_migrations(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO health_events
                (event_type, start_time, value, unit, source, created_at)
            VALUES ('weight', '2026-07-19T00:00:00Z', 80.0, 'kg', 'manual',
                    '2026-07-19T00:00:00Z')
            """
        )
        conn.commit()

        try:
            conn.execute("UPDATE health_events SET value = 99.0 WHERE id = 1")
            conn.commit()
            raised = False
        except sqlite3.IntegrityError:
            raised = True

        assert raised
    finally:
        conn.close()
