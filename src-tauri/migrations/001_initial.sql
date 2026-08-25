-- MeshyForge — Initial SQLite Schema (Migration 001)
-- Source: TDD §6.1

-- Asset records: one row per completed Meshy task
CREATE TABLE IF NOT EXISTS assets (
    id              TEXT PRIMARY KEY,           -- Meshy task ID (UUID)
    meshy_type      TEXT NOT NULL,              -- "text-to-3d-preview" | "image-to-3d" | "retexture" | etc.
    parent_task_id  TEXT,                        -- Links refine → preview, retexture → source, etc.
    prompt          TEXT,                        -- Original prompt (if text-based)
    image_url       TEXT,                        -- Original image URL (if image-based)
    ai_model        TEXT,                        -- "meshy-6" | "meshy-7" | "latest" | etc.
    status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | IN_PROGRESS | SUCCEEDED | FAILED | CANCELED
    progress        INTEGER NOT NULL DEFAULT 0,  -- 0-100
    consumed_credits INTEGER DEFAULT 0,
    thumbnail_path  TEXT,                        -- Local path to thumbnail PNG
    file_paths      TEXT NOT NULL DEFAULT '{}',  -- JSON: { "glb": "...", "fbx": "...", ... }
    texture_paths   TEXT NOT NULL DEFAULT '[]',  -- JSON: [{ "base_color": "...", "metallic": "...", ... }]
    notes           TEXT DEFAULT '',
    tags            TEXT DEFAULT '[]',           -- JSON array of strings
    created_at      INTEGER NOT NULL,           -- Unix ms (from Meshy)
    started_at      INTEGER DEFAULT 0,
    finished_at     INTEGER DEFAULT 0,
    downloaded_at   INTEGER DEFAULT 0,           -- When files were saved locally
    error_message   TEXT,
    -- Denormalized for quick filtering
    has_textures    INTEGER DEFAULT 0,           -- Boolean
    has_rig         INTEGER DEFAULT 0,
    has_animation   INTEGER DEFAULT 0,
    -- User metadata
    favorite        INTEGER DEFAULT 0,
    last_viewed_at  INTEGER DEFAULT 0
);

-- Task log: every API call (successful or not), for audit/debugging
CREATE TABLE IF NOT EXISTS task_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    meshy_task_id   TEXT,                        -- Foreign key to assets.id (nullable if failed before ID)
    endpoint        TEXT NOT NULL,               -- e.g. "POST /openapi/v2/text-to-3d"
    request_body    TEXT,                        -- JSON of the request payload
    response_status INTEGER,                     -- HTTP status code
    response_body   TEXT,                        -- JSON of the response (truncated if large)
    error           TEXT,
    timestamp       INTEGER NOT NULL,
    credits_before  INTEGER,
    credits_after   INTEGER
);

-- Tags: normalized tag table for fast filtering
CREATE TABLE IF NOT EXISTS tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT UNIQUE NOT NULL,
    color           TEXT DEFAULT '#6b7280',      -- Hex color for UI badge
    created_at      INTEGER NOT NULL
);

-- Asset-Tag junction
CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id        TEXT NOT NULL,
    tag_id          INTEGER NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- App settings: key-value store for preferences
CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version         INTEGER PRIMARY KEY,
    applied_at      INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(meshy_type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_favorite ON assets(favorite);
CREATE INDEX IF NOT EXISTS idx_task_log_task ON task_log(meshy_task_id);
CREATE INDEX IF NOT EXISTS idx_task_log_time ON task_log(timestamp DESC);

-- Record this migration (idempotent — won't fail on restart)
INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (1, strftime('%s', 'now') * 1000);