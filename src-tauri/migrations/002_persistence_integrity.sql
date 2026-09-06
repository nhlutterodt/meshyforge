-- MeshyForge — Persistence integrity migration
-- Source: ADR-0008

BEGIN;

ALTER TABLE assets ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
UPDATE assets SET updated_at = CASE
    WHEN last_viewed_at > created_at THEN last_viewed_at
    ELSE created_at
END;

CREATE TABLE task_log_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    meshy_task_id   TEXT,
    endpoint        TEXT NOT NULL,
    request_body    TEXT,
    response_status INTEGER,
    response_body   TEXT,
    error           TEXT,
    timestamp       INTEGER NOT NULL,
    credits_before  INTEGER,
    credits_after   INTEGER,
    FOREIGN KEY (meshy_task_id) REFERENCES assets(id) ON DELETE SET NULL
);

INSERT INTO task_log_new (
    id, meshy_task_id, endpoint, request_body, response_status,
    response_body, error, timestamp, credits_before, credits_after
)
SELECT
    id, meshy_task_id, endpoint, request_body, response_status,
    response_body, error, timestamp, credits_before, credits_after
FROM task_log;

DROP TABLE task_log;
ALTER TABLE task_log_new RENAME TO task_log;

CREATE INDEX IF NOT EXISTS idx_task_log_task ON task_log(meshy_task_id);
CREATE INDEX IF NOT EXISTS idx_task_log_time ON task_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_assets_updated ON assets(updated_at DESC);

COMMIT;
