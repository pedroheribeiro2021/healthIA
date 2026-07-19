import hashlib
import json
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from app.domain.models import RawRecord, RawRecordInput


class SqliteRawRecordRepository:
    """Implementação SQLite de RawRecordRepository (app.domain.repositories)."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def add(self, raw: RawRecordInput) -> tuple[RawRecord, bool]:
        canonical = json.dumps(raw.payload, sort_keys=True, separators=(",", ":"))
        payload_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        received_at = datetime.now(UTC).isoformat()

        try:
            with self._engine.begin() as conn:
                result = conn.execute(
                    text(
                        """
                        INSERT INTO raw_records
                            (source, record_type, external_id, payload, payload_hash,
                             device_id, received_at, norm_status)
                        VALUES
                            (:source, :record_type, :external_id, :payload, :payload_hash,
                             :device_id, :received_at, 'pending')
                        """
                    ),
                    {
                        "source": raw.source,
                        "record_type": raw.record_type,
                        "external_id": raw.external_id,
                        "payload": canonical,
                        "payload_hash": payload_hash,
                        "device_id": raw.device_id,
                        "received_at": received_at,
                    },
                )
                new_id = result.lastrowid
        except IntegrityError:
            existing = self._find_by_hash(payload_hash)
            if existing is None:
                raise
            return existing, True

        record = RawRecord(
            id=new_id,
            source=raw.source,
            record_type=raw.record_type,
            external_id=raw.external_id,
            payload=raw.payload,
            payload_hash=payload_hash,
            device_id=raw.device_id,
            received_at=datetime.fromisoformat(received_at),
            norm_status="pending",
            norm_error=None,
        )
        return record, False

    def mark_normalized(self, raw_record_id: int, status: str, error: str | None = None) -> None:
        with self._engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE raw_records SET norm_status = :status, norm_error = :error "
                    "WHERE id = :id"
                ),
                {"status": status, "error": error, "id": raw_record_id},
            )

    def get(self, raw_record_id: int) -> RawRecord | None:
        with self._engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT id, source, record_type, external_id, payload, payload_hash,
                           device_id, received_at, norm_status, norm_error
                    FROM raw_records WHERE id = :id
                    """
                ),
                {"id": raw_record_id},
            ).fetchone()
        return self._row_to_record(row) if row else None

    def list_pending(self) -> list[RawRecord]:
        """raw_records ainda não normalizados com sucesso (pending ou error) —
        usado pelo comando de reprocesso (ver docs/ARCHITECTURE.md)."""
        with self._engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT id, source, record_type, external_id, payload, payload_hash,
                           device_id, received_at, norm_status, norm_error
                    FROM raw_records WHERE norm_status IN ('pending', 'error')
                    ORDER BY id
                    """
                )
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    def _find_by_hash(self, payload_hash: str) -> RawRecord | None:
        with self._engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT id, source, record_type, external_id, payload, payload_hash,
                           device_id, received_at, norm_status, norm_error
                    FROM raw_records WHERE payload_hash = :h
                    """
                ),
                {"h": payload_hash},
            ).fetchone()
        return self._row_to_record(row) if row else None

    @staticmethod
    def _row_to_record(row) -> RawRecord:
        return RawRecord(
            id=row.id,
            source=row.source,
            record_type=row.record_type,
            external_id=row.external_id,
            payload=json.loads(row.payload),
            payload_hash=row.payload_hash,
            device_id=row.device_id,
            received_at=datetime.fromisoformat(row.received_at),
            norm_status=row.norm_status,
            norm_error=row.norm_error,
        )
