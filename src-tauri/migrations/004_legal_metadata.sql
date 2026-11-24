-- 004_legal_metadata.sql — the per-asset rights record (ADR-0018 / LM-01)
--
-- Five NULLABLE columns, no DEFAULT and no CHECK, following the precedent set by
-- 002_persistence_integrity.sql:7. Two reasons there is no CHECK constraint:
--
--   1. `ALTER TABLE ... ADD COLUMN` with a CHECK is version-dependent — not a
--      thing to gamble a migration on.
--   2. The tri-state domain lives in Rust (`RightsPredicate`), where it is
--      exhaustively matchable, instead of in a constraint that may not apply.
--      An unrecognised stored value degrades to `Unknown` rather than panicking,
--      which is the fail-safe direction for a legal record.
--
-- NULL means PRE-BASELINE (ND-8): the asset predates this column and nothing was
-- ever recorded. 'unknown' means a RECORDED ASSERTION that the owner does not
-- know. Collapsing the two would turn "nobody ever asked" into "the owner said
-- they do not know" — a false statement about the owner.
--
-- Stored values:
--   plan_tier_at_generation        'free' | 'paid' | 'unknown'
--   published_to_community         'yes'  | 'no'   | 'unknown'
--   third_party_material_attested  'yes'  | 'no'   | 'unknown'
--   disclosure_posture             'yes'  | 'no'   | 'unknown'
--   rights_recorded_at             Unix milliseconds (project convention)
--
-- The rights IDENTIFIER is deliberately NOT a column: it is derived on read from
-- these predicates so the two NOASSERTION states stay distinguishable and a
-- corrected reading of the provider terms re-derives every asset with no
-- migration (ADR-0018 decision 3).

ALTER TABLE assets ADD COLUMN plan_tier_at_generation TEXT;
ALTER TABLE assets ADD COLUMN published_to_community TEXT;
ALTER TABLE assets ADD COLUMN third_party_material_attested TEXT;
ALTER TABLE assets ADD COLUMN disclosure_posture TEXT;
ALTER TABLE assets ADD COLUMN rights_recorded_at INTEGER;
