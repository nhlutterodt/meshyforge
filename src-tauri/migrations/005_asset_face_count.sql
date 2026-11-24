-- 005_asset_face_count.sql — triangle count for the rigging pre-spend gate
-- Source: TASK-0032 / FRD FR-POST-06-F5
--
-- NULL means UNKNOWN (never extracted, non-GLB asset, or parse failure).
-- RiggingPanel keeps its static warning for NULL and only disables on a
-- KNOWN count over the limit — a DEFAULT 0 would assert "zero faces", a
-- false fact. Bare nullable follows the 004 precedent where NULL carries
-- meaning (ND-8): no DEFAULT, no CHECK.
--
-- No index: face_count is read per-asset by the rigging gate, never
-- filtered or sorted on (skill convention: index filter/sort columns only).
--
-- No BEGIN/COMMIT here: run_migrations wraps this file and its
-- schema_version row in a single transaction.

ALTER TABLE assets ADD COLUMN face_count INTEGER;