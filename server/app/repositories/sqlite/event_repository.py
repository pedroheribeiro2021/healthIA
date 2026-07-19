import json
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.domain.models import HealthEvent


class SqliteEventRepository:
    """Implementação SQLite de EventRepository (app.domain.repositories)."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def add(self, event: HealthEvent) -> HealthEvent:
        now = datetime.now(UTC).isoformat()
        with self._engine.begin() as conn:
            result = conn.execute(
                text(
                    """
                    INSERT INTO health_events
                        (event_type, start_time, end_time, value, unit, detail,
                         source, raw_record_id, created_at)
                    VALUES
                        (:event_type, :start_time, :end_time, :value, :unit, :detail,
                         :source, :raw_record_id, :created_at)
                    """
                ),
                {
                    "event_type": event.event_type,
                    "start_time": event.start_time.isoformat(),
                    "end_time": event.end_time.isoformat() if event.end_time else None,
                    "value": event.value,
                    "unit": event.unit,
                    "detail": json.dumps(event.detail) if event.detail is not None else None,
                    "source": event.source,
                    "raw_record_id": event.raw_record_id,
                    "created_at": now,
                },
            )
            new_id = result.lastrowid
        return event.model_copy(update={"id": new_id, "created_at": datetime.fromisoformat(now)})

    def list_by_type(self, event_type: str, start: datetime, end: datetime) -> list[HealthEvent]:
        with self._engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT id, event_type, start_time, end_time, value, unit, detail,
                           source, raw_record_id, superseded_by, created_at
                    FROM health_events
                    WHERE event_type = :event_type
                      AND start_time >= :start
                      AND start_time < :end
                      AND superseded_by IS NULL
                    ORDER BY start_time
                    """
                ),
                {
                    "event_type": event_type,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                },
            ).fetchall()
        return [self._row_to_event(row) for row in rows]

    @staticmethod
    def _row_to_event(row) -> HealthEvent:
        return HealthEvent(
            id=row.id,
            event_type=row.event_type,
            start_time=datetime.fromisoformat(row.start_time),
            end_time=datetime.fromisoformat(row.end_time) if row.end_time else None,
            value=row.value,
            unit=row.unit,
            detail=json.loads(row.detail) if row.detail else None,
            source=row.source,
            raw_record_id=row.raw_record_id,
            superseded_by=row.superseded_by,
            created_at=datetime.fromisoformat(row.created_at),
        )
