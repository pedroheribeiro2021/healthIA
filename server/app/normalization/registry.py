from typing import Protocol

from app.domain.models import HealthEvent, RawRecord


class Normalizer(Protocol):
    """Contrato de normalização (ver docs/ARCHITECTURE.md — Normalization Engine)."""

    def normalize(self, raw: RawRecord) -> list[HealthEvent]: ...


_registry: dict[tuple[str, str], Normalizer] = {}


def register(source: str, record_type: str, normalizer: Normalizer) -> None:
    _registry[(source, record_type)] = normalizer


def get_normalizer(source: str, record_type: str) -> Normalizer | None:
    return _registry.get((source, record_type))
