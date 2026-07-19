from datetime import datetime
from typing import Protocol

from app.domain.models import HealthEvent


class EventRepository(Protocol):
    """Única interface de acesso a health_events. Implementação concreta é um detalhe
    substituível (ver docs/ARCHITECTURE.md — Desacoplamento)."""

    def add(self, event: HealthEvent) -> HealthEvent: ...

    def list_by_type(
        self, event_type: str, start: datetime, end: datetime
    ) -> list[HealthEvent]: ...
