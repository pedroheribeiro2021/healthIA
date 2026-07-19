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


class RawRecordInput(BaseModel):
    """Dados de entrada para gravar um raw_record (ver docs/DATA_MODEL.md)."""

    source: str
    record_type: str
    payload: dict[str, Any]
    external_id: str | None = None
    device_id: str | None = None


class RawRecord(BaseModel):
    """Registro bruto persistido — imutável exceto norm_status/norm_error."""

    id: int
    source: str
    record_type: str
    external_id: str | None
    payload: dict[str, Any]
    payload_hash: str
    device_id: str | None
    received_at: datetime
    norm_status: str
    norm_error: str | None
