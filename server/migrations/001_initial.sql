-- Migration 001: schema completo inicial (ver docs/DATA_MODEL.md)

-- Camada 1 — bruto
CREATE TABLE raw_records (
    id              INTEGER PRIMARY KEY,
    source          TEXT NOT NULL,
    record_type     TEXT NOT NULL,
    external_id     TEXT,
    payload         TEXT NOT NULL,
    payload_hash    TEXT NOT NULL,
    device_id       TEXT,
    received_at     TEXT NOT NULL,
    norm_status     TEXT NOT NULL DEFAULT 'pending',
    norm_error      TEXT,
    UNIQUE (source, external_id),
    UNIQUE (payload_hash)
);

-- Camada 2 — eventos normalizados (fonte da verdade)
CREATE TABLE health_events (
    id              INTEGER PRIMARY KEY,
    event_type      TEXT NOT NULL,
    start_time      TEXT NOT NULL,
    end_time        TEXT,
    value           REAL,
    unit            TEXT,
    detail          TEXT,
    source          TEXT NOT NULL,
    raw_record_id   INTEGER REFERENCES raw_records(id),
    superseded_by   INTEGER REFERENCES health_events(id),
    created_at      TEXT NOT NULL
);
CREATE INDEX idx_events_type_time ON health_events (event_type, start_time);

-- Tabelas de domínio (não-eventos)
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    servings REAL NOT NULL DEFAULT 1,
    instructions TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recipe_ingredients (
    id INTEGER PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    food_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    kcal REAL, protein_g REAL, carbs_g REAL, fat_g REAL, micros TEXT
);

CREATE TABLE foods (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    per_100g TEXT NOT NULL
);

CREATE TABLE shopping_list_items (
    id INTEGER PRIMARY KEY,
    food_name TEXT NOT NULL,
    quantity REAL, unit TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    origin_recipe_id INTEGER REFERENCES recipes(id),
    created_at TEXT NOT NULL
);

CREATE TABLE goals (
    id INTEGER PRIMARY KEY,
    metric_id TEXT NOT NULL,
    target_value REAL NOT NULL,
    direction TEXT NOT NULL,
    deadline TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Camada derivada (recalculável)
CREATE TABLE metric_snapshots (
    id INTEGER PRIMARY KEY,
    metric_id TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    value REAL,
    detail TEXT,
    computed_at TEXT NOT NULL,
    algo_version TEXT NOT NULL,
    UNIQUE (metric_id, period_start, period_end, algo_version)
);

CREATE TABLE insights (
    id INTEGER PRIMARY KEY,
    rule_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    evidence TEXT,
    period_start TEXT, period_end TEXT,
    created_at TEXT NOT NULL,
    dismissed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recommendations (
    id INTEGER PRIMARY KEY,
    insight_id INTEGER REFERENCES insights(id),
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE daily_summary (
    day TEXT PRIMARY KEY,
    sleep_duration_s REAL, sleep_score REAL,
    resting_hr REAL, hrv_rmssd REAL,
    steps INTEGER, workouts INTEGER, training_load REAL,
    kcal_in REAL, protein_g REAL, water_l REAL,
    weight_kg REAL,
    recovery_score REAL,
    computed_at TEXT NOT NULL
);

-- Proteção de append-only (ver docs/DATA_MODEL.md — Regras de integridade)
CREATE TRIGGER trg_raw_records_no_delete
BEFORE DELETE ON raw_records
BEGIN
    SELECT RAISE(ABORT, 'raw_records is append-only: delete not allowed');
END;

CREATE TRIGGER trg_raw_records_restrict_update
BEFORE UPDATE ON raw_records
WHEN NEW.source != OLD.source
  OR NEW.record_type != OLD.record_type
  OR NEW.external_id IS NOT OLD.external_id
  OR NEW.payload != OLD.payload
  OR NEW.payload_hash != OLD.payload_hash
  OR NEW.device_id IS NOT OLD.device_id
  OR NEW.received_at != OLD.received_at
BEGIN
    SELECT RAISE(ABORT, 'raw_records: only norm_status/norm_error can be updated');
END;

CREATE TRIGGER trg_health_events_no_delete
BEFORE DELETE ON health_events
BEGIN
    SELECT RAISE(ABORT, 'health_events is append-only: delete not allowed');
END;

CREATE TRIGGER trg_health_events_restrict_update
BEFORE UPDATE ON health_events
WHEN NEW.event_type != OLD.event_type
  OR NEW.start_time != OLD.start_time
  OR NEW.end_time IS NOT OLD.end_time
  OR NEW.value IS NOT OLD.value
  OR NEW.unit IS NOT OLD.unit
  OR NEW.detail IS NOT OLD.detail
  OR NEW.source != OLD.source
  OR NEW.raw_record_id IS NOT OLD.raw_record_id
  OR NEW.created_at != OLD.created_at
BEGIN
    SELECT RAISE(ABORT, 'health_events: only superseded_by can be updated');
END;
