from datetime import UTC, datetime

from app.domain.models import RawRecord
from app.normalization.manual import ManualNormalizer


def _raw(record_type: str, payload: dict) -> RawRecord:
    return RawRecord(
        id=1,
        source="manual",
        record_type=record_type,
        external_id=None,
        payload=payload,
        payload_hash="irrelevant",
        device_id=None,
        received_at=datetime(2026, 7, 19, tzinfo=UTC),
        norm_status="pending",
        norm_error=None,
    )


def test_normalize_weight() -> None:
    raw = _raw("weight", {"occurred_at": "2026-07-18T12:00:00+00:00", "value_kg": 82.5})

    events = ManualNormalizer().normalize(raw)

    assert len(events) == 1
    event = events[0]
    assert event.event_type == "weight"
    assert event.value == 82.5
    assert event.unit == "kg"
    assert event.source == "manual"
    assert event.raw_record_id == 1
    assert event.start_time == datetime(2026, 7, 18, 12, 0, tzinfo=UTC)


def test_normalize_hydration() -> None:
    raw = _raw("hydration", {"occurred_at": "2026-07-18T12:00:00+00:00", "value_l": 0.5})

    events = ManualNormalizer().normalize(raw)

    assert events[0].event_type == "hydration"
    assert events[0].value == 0.5
    assert events[0].unit == "l"


def test_normalize_meal() -> None:
    raw = _raw(
        "meal",
        {
            "occurred_at": "2026-07-18T12:00:00+00:00",
            "kcal": 650.0,
            "meal_type": "lunch",
            "protein_g": 40.0,
            "carbs_g": 60.0,
            "fat_g": 20.0,
        },
    )

    events = ManualNormalizer().normalize(raw)

    event = events[0]
    assert event.event_type == "meal"
    assert event.value == 650.0
    assert event.unit == "kcal"
    assert event.detail == {
        "meal_type": "lunch",
        "protein_g": 40.0,
        "carbs_g": 60.0,
        "fat_g": 20.0,
    }


def test_normalize_note() -> None:
    raw = _raw("note", {"occurred_at": "2026-07-18T12:00:00+00:00", "text": "dor no joelho"})

    events = ManualNormalizer().normalize(raw)

    event = events[0]
    assert event.event_type == "note"
    assert event.value is None
    assert event.unit is None
    assert event.detail == {"text": "dor no joelho"}


def test_normalize_unknown_record_type_raises() -> None:
    raw = _raw("unknown", {"occurred_at": "2026-07-18T12:00:00+00:00"})

    try:
        ManualNormalizer().normalize(raw)
        raised = False
    except ValueError:
        raised = True

    assert raised
