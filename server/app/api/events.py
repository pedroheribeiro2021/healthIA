from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.engine import Engine

from app.api.deps import get_engine
from app.domain.models import HealthEvent, RawRecordInput
from app.normalization.service import normalize_and_store
from app.repositories.sqlite.event_repository import SqliteEventRepository
from app.repositories.sqlite.raw_record_repository import SqliteRawRecordRepository

router = APIRouter(prefix="/api/v1")


class _TimestampedManualPayload(BaseModel):
    occurred_at: datetime

    @field_validator("occurred_at")
    @classmethod
    def _require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("occurred_at precisa incluir timezone (ISO 8601 com offset ou 'Z')")
        return value.astimezone(UTC)


class ManualWeightPayload(_TimestampedManualPayload):
    record_type: Literal["weight"] = "weight"
    value_kg: float


class ManualHydrationPayload(_TimestampedManualPayload):
    record_type: Literal["hydration"] = "hydration"
    value_l: float


class ManualMealPayload(_TimestampedManualPayload):
    record_type: Literal["meal"] = "meal"
    kcal: float
    meal_type: str | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None


class ManualNotePayload(_TimestampedManualPayload):
    record_type: Literal["note"] = "note"
    text: str


ManualEventPayload = Annotated[
    ManualWeightPayload | ManualHydrationPayload | ManualMealPayload | ManualNotePayload,
    Field(discriminator="record_type"),
]


class ManualEventResponse(BaseModel):
    raw_record_id: int
    duplicate: bool
    event: HealthEvent | None


@router.post("/events/manual", status_code=201)
def create_manual_event(
    payload: ManualEventPayload,
    engine: Annotated[Engine, Depends(get_engine)],
) -> ManualEventResponse:
    raw_payload: dict[str, Any] = payload.model_dump(mode="json", exclude={"record_type"})
    raw_repo = SqliteRawRecordRepository(engine)
    raw, is_duplicate = raw_repo.add(
        RawRecordInput(source="manual", record_type=payload.record_type, payload=raw_payload)
    )

    if is_duplicate:
        return ManualEventResponse(raw_record_id=raw.id, duplicate=True, event=None)

    event_repo = SqliteEventRepository(engine)
    try:
        saved_events = normalize_and_store(raw, event_repo, raw_repo)
    except LookupError as exc:
        raise HTTPException(
            status_code=500, detail="Normalizer não configurado para este tipo"
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Falha ao normalizar evento manual") from exc

    return ManualEventResponse(raw_record_id=raw.id, duplicate=False, event=saved_events[0])


@router.get("/events")
def list_events(
    engine: Annotated[Engine, Depends(get_engine)],
    event_type: str,
    date_from: Annotated[datetime | None, Query(alias="from")] = None,
    date_to: Annotated[datetime | None, Query(alias="to")] = None,
) -> list[HealthEvent]:
    repo = SqliteEventRepository(engine)
    start = date_from or datetime(1970, 1, 1, tzinfo=UTC)
    end = date_to or datetime.now(UTC) + timedelta(days=1)
    return repo.list_by_type(event_type, start, end)
