import sqlite3
from datetime import UTC, datetime
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "migrations"


def run_migrations(db_path: Path) -> list[int]:
    """Aplica as migrations pendentes de MIGRATIONS_DIR, em ordem, registrando cada
    versão em schema_version. Idempotente: migrations já aplicadas são ignoradas.

    Usa sqlite3 puro (não SQLAlchemy Core) porque migrations podem conter múltiplos
    statements com triggers (BEGIN..END com ';' interno), que exigem executescript.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )
        applied = {row[0] for row in conn.execute("SELECT version FROM schema_version")}

        newly_applied: list[int] = []
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = int(path.name.split("_", 1)[0])
            if version in applied:
                continue
            conn.executescript(path.read_text(encoding="utf-8"))
            conn.execute(
                "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
                (version, datetime.now(UTC).isoformat()),
            )
            conn.commit()
            newly_applied.append(version)
        return newly_applied
    finally:
        conn.close()
