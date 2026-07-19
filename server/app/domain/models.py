from datetime import datetime
from typing import Any

from pydantic import BaseModel


class HealthEvent(BaseModel):
    """Evento normalizado — fonte da verdade (ver docs/DATA_MODEL.md)."""

    id: int | None = None
    event_type: str
    start_time: datetime
    end_time: datetime | None = None
    value: float | None = None
    unit: str | None = None
    detail: dict[str, Any] | None = None
    source: str
    raw_record_id: int | None = None
    superseded_by: int | None = None
    created_at: datetime | None = None
