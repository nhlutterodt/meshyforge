-- MeshyForge — Paged asset ordering index (Migration 003)
-- Source: DAT-01 pagination; findings P-01 in
--         docs/audits/perf-findings-asset-read-path-2026-11-08.md
--
-- No BEGIN/COMMIT here: run_migrations wraps this file and its schema_version
-- row in a single transaction so they commit or roll back together.

-- The paged list/search queries order by `created_at DESC, id ASC`, where the
-- `id` tiebreaker is what makes offset paging deterministic when
-- provider-supplied timestamps collide. `idx_assets_created` (001_initial.sql)
-- covers only `created_at`, so SQLite could not satisfy that full ORDER BY from
-- it: it scanned the index and then ran
-- `USE TEMP B-TREE FOR RIGHT PART OF ORDER BY`, sorting the entire table before
-- it could return the first 50 rows. This composite matches the ORDER BY
-- term-for-term, which removes the sorter.
--
-- Measured on 2000 rows with distinct created_at (the production shape), on the
-- exact shipping query `SELECT * ... ORDER BY created_at DESC, id ASC LIMIT 50
-- OFFSET 1000`: 1.053 ms with a temp B-tree vs 92.4 us with this index.
--
-- Additive only. `idx_assets_created` becomes arguably redundant for query
-- serving (a composite's leftmost prefix also satisfies `ORDER BY created_at
-- DESC`), but dropping it is a separate, destructive schema decision this
-- change does not need: the composite removes the sorter whether or not the
-- narrower index is present. Recorded as a possible follow-up, not done here.
CREATE INDEX IF NOT EXISTS idx_assets_created_id
    ON assets(created_at DESC, id ASC);
