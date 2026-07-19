from datetime import datetime
from typing import Protocol

from app.domain.models import HealthEvent, RawRecord, RawRecordInput


class EventRepository(Protocol):
    """Única interface de acesso a health_events. Implementação concreta é um detalhe
    substituível (ver docs/ARCHITECTURE.md — Desacoplamento)."""

    def add(self, event: HealthEvent) -> HealthEvent: ...

    def list_by_type(
        self, event_type: str, start: datetime, end: datetime
    ) -> list[HealthEvent]: ...


class RawRecordRepository(Protocol):
    """Única interface de acesso a raw_records."""

    def add(self, raw: RawRecordInput) -> tuple[RawRecord, bool]:
        """Insere o registro bruto. Retorna (registro, is_duplicate) — deduplicação
        por (source, external_id) ou payload_hash (ver docs/DATA_MODEL.md)."""
        ...

    def mark_normalized(
        self, raw_record_id: int, status: str, error: str | None = None
    ) -> None: ...

    def get(self, raw_record_id: int) -> RawRecord | None: ...

    def list_pending(self) -> list[RawRecord]:
        """raw_records ainda não normalizados com sucesso (pending ou error)."""
        ...
