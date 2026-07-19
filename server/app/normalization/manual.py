from datetime import datetime

from app.domain.models import HealthEvent, RawRecord
from app.normalization.registry import register

_RECORD_TYPES = ("weight", "hydration", "meal", "note")


class ManualNormalizer:
    """Normaliza registros digitados manualmente (peso, hidratação, refeição, nota)."""

    def normalize(self, raw: RawRecord) -> list[HealthEvent]:
        payload = raw.payload
        occurred_at = datetime.fromisoformat(payload["occurred_at"])

        if raw.record_type == "weight":
            return [self._event(raw, "weight", occurred_at, payload["value_kg"], "kg")]
        if raw.record_type == "hydration":
            return [self._event(raw, "hydration", occurred_at, payload["value_l"], "l")]
        if raw.record_type == "meal":
            detail = {
                "meal_type": payload.get("meal_type"),
                "protein_g": payload.get("protein_g"),
                "carbs_g": payload.get("carbs_g"),
                "fat_g": payload.get("fat_g"),
            }
            return [self._event(raw, "meal", occurred_at, payload["kcal"], "kcal", detail)]
        if raw.record_type == "note":
            return [self._event(raw, "note", occurred_at, None, None, {"text": payload["text"]})]

        raise ValueError(f"manual: record_type desconhecido: {raw.record_type}")

    @staticmethod
    def _event(
        raw: RawRecord,
        event_type: str,
        start_time: datetime,
        value: float | None,
        unit: str | None,
        detail: dict | None = None,
    ) -> HealthEvent:
        return HealthEvent(
            event_type=event_type,
            start_time=start_time,
            value=value,
            unit=unit,
            detail=detail,
            source="manual",
            raw_record_id=raw.id,
        )


_normalizer = ManualNormalizer()
for _record_type in _RECORD_TYPES:
    register("manual", _record_type, _normalizer)
