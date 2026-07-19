from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("HEALTHAI_DB_PATH", str(tmp_path / "healthai.db"))
    return TestClient(create_app())


def test_create_manual_weight_event(tmp_path: Path, monkeypatch) -> None:
    with _client(tmp_path, monkeypatch) as client:
        response = client.post(
            "/api/v1/events/manual",
            json={
                "record_type": "weight",
                "occurred_at": "2026-07-18T12:00:00Z",
                "value_kg": 82.5,
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["duplicate"] is False
        assert body["event"]["event_type"] == "weight"
        assert body["event"]["value"] == 82.5
        assert body["event"]["unit"] == "kg"

        listed = client.get("/api/v1/events", params={"event_type": "weight"})
        assert listed.status_code == 200
        events = listed.json()
        assert len(events) == 1
        assert events[0]["value"] == 82.5


def test_duplicate_manual_event_is_not_recreated(tmp_path: Path, monkeypatch) -> None:
    payload = {
        "record_type": "weight",
        "occurred_at": "2026-07-18T12:00:00Z",
        "value_kg": 82.5,
    }
    with _client(tmp_path, monkeypatch) as client:
        first = client.post("/api/v1/events/manual", json=payload)
        second = client.post("/api/v1/events/manual", json=payload)

        assert first.json()["duplicate"] is False
        assert second.json()["duplicate"] is True
        assert second.json()["raw_record_id"] == first.json()["raw_record_id"]

        listed = client.get("/api/v1/events", params={"event_type": "weight"})
        assert len(listed.json()) == 1


def test_manual_event_requires_timezone(tmp_path: Path, monkeypatch) -> None:
    with _client(tmp_path, monkeypatch) as client:
        response = client.post(
            "/api/v1/events/manual",
            json={
                "record_type": "weight",
                "occurred_at": "2026-07-18T12:00:00",
                "value_kg": 82.5,
            },
        )

        assert response.status_code == 422


def test_create_manual_note_event(tmp_path: Path, monkeypatch) -> None:
    with _client(tmp_path, monkeypatch) as client:
        response = client.post(
            "/api/v1/events/manual",
            json={
                "record_type": "note",
                "occurred_at": "2026-07-18T12:00:00Z",
                "text": "dor no joelho",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["event"]["detail"] == {"text": "dor no joelho"}
