from app.domain.models import HealthEvent, RawRecord
from app.domain.repositories import EventRepository, RawRecordRepository
from app.normalization.registry import get_normalizer


def normalize_and_store(
    raw: RawRecord, event_repo: EventRepository, raw_repo: RawRecordRepository
) -> list[HealthEvent]:
    """Normaliza um raw_record e grava os health_events resultantes. Marca o
    raw_record como 'done' ou 'error' (ver docs/ARCHITECTURE.md — Normalization Engine).
    """
    normalizer = get_normalizer(raw.source, raw.record_type)
    if normalizer is None:
        raw_repo.mark_normalized(raw.id, "error", "normalizer não encontrado")
        raise LookupError(f"normalizer não encontrado para ({raw.source}, {raw.record_type})")

    try:
        events = normalizer.normalize(raw)
    except Exception as exc:
        raw_repo.mark_normalized(raw.id, "error", str(exc))
        raise

    saved = [event_repo.add(event) for event in events]
    raw_repo.mark_normalized(raw.id, "done")
    return saved
