from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_ok(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("HEALTHAI_DB_PATH", str(tmp_path / "healthai.db"))
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
