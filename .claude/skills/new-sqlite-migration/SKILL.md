---
name: new-sqlite-migration
description: >-
  Scaffolds a new numbered SQLite migration for MeshyForge's Rust backend —
  creates the `.sql` file, registers it in the `MIGRATIONS` const array in
  `storage/migrations.rs`, and enforces sequential versioning against the
  `schema_version` table plus the project's FK/index conventions. Use when
  adding or changing any SQLite table, column, index, or constraint (assets,
  task_log, tags, asset_tags, settings, or a brand-new table) — not for
  writing ad-hoc queries against the existing schema.
---

# New SQLite Migration

Scaffolds one new versioned migration for MeshyForge's `rusqlite` database, following the migration system defined in `technical_stack_documentation.md` §10.5.

## Source-of-truth correction (read before using this skill)

`technical_stack_documentation.md` §10.5 is internally inconsistent about where migration `.sql` files live, and the tree in `technical_design_document.md` §5 doesn't show a migrations directory at all:

- The registry file is `src-tauri/src/storage/migrations.rs`.
- Its `MIGRATIONS` array embeds files via `include_str!("../migrations/001_initial.sql")`. A relative path of `../migrations/` from `src-tauri/src/storage/migrations.rs` resolves to **`src-tauri/src/migrations/`** (up one level, out of `storage/`, into a sibling `migrations/` folder under `src/`).
- The SQL file's own header comment in the same doc says `-- src-tauri/migrations/001_initial.sql` (one level higher, sibling to `src/` itself) — which does **not** match the `include_str!` path shown three lines above it.

**This skill follows the path that actually compiles**: `include_str!` is the operative code, so migration files go in **`src-tauri/src/migrations/`**, not `src-tauri/migrations/`. Before running this skill, check whether `src-tauri/src/storage/migrations.rs` already exists in the repo — if it does, read its actual `include_str!` paths and match them exactly instead of trusting this doc excerpt, in case the doc was corrected during implementation.

## Steps

1. **Find the current state.** Read `src-tauri/src/storage/migrations.rs` (if it doesn't exist yet, this is migration `001` and you're also scaffolding the registry file and `run_migrations()` — see §10.5 for the full function body). Find the `MIGRATIONS` const array and determine the highest existing version number `N`.

2. **Pick the next version.** The new migration is `N + 1`. Versions are sequential integers starting at `1` — no gaps, no reuse of a retired number, no decimals. Never renumber an already-applied migration; if a mistake ships, add a new migration that corrects it.

3. **Name the file** `{version:03d}_{snake_case_description}.sql`, e.g. `002_add_export_presets.sql`, matching the pattern already visible in the doc's commented-out future entries. Place it in `src-tauri/src/migrations/` (see correction above).

4. **Write the SQL.** Follow the conventions established in `001_initial.sql`:
   - Table and column names are `snake_case` (coding_standards.md §3.3).
   - Every junction/child table that references another table's primary key uses `FOREIGN KEY (...) REFERENCES parent(id) ON DELETE CASCADE` — see `asset_tags` in `001_initial.sql`, which cascades on both `asset_id → assets(id)` and `tag_id → tags(id)`.
   - Add a `CREATE INDEX` for every column a query will filter or sort on. `001_initial.sql` indexes `assets(status)`, `assets(meshy_type)`, `assets(created_at DESC)`, `assets(favorite)`, `task_log(meshy_task_id)`, and `task_log(timestamp DESC)` — mirror this: index filter/sort columns, not every column.
   - Timestamps are `INTEGER` (Unix milliseconds), not `TEXT` or SQLite's `DATETIME`.
   - Give new nullable/optional columns an explicit `DEFAULT` matching the existing style (`DEFAULT 0`, `DEFAULT ''`, `DEFAULT '[]'`/`'{}'` for JSON-as-TEXT columns), not a bare nullable column.
   - Do not touch `schema_version` — `run_migrations()` manages inserts into it automatically.
   - This file is exempt from the 300-line file-size rule (ORG-10 in coding_standards.md explicitly excepts files embedded via `include_str!`), but keep a single migration scoped to one logical change anyway.

5. **Register the migration.** Add a new tuple to the `MIGRATIONS` const array in `migrations.rs`, immediately after the last real (non-comment) entry, in ascending version order:
   ```rust
   const MIGRATIONS: &[(i64, &str)] = &[
       (1, include_str!("../migrations/001_initial.sql")),
       (2, include_str!("../migrations/002_add_export_presets.sql")), // new
   ];
   ```
   Do not reorder existing entries. Do not skip a version number even if a placeholder comment for it exists — replace the matching commented-out line if the doc already stubbed it out.

6. **Verify the apply path.** `run_migrations()` compares `MAX(version)` in `schema_version` against each entry in `MIGRATIONS` and applies (via `execute_batch`) any tuple whose version is greater than the current max, then inserts a `schema_version` row with `chrono::Utc::now().timestamp_millis()`. Do not write a separate "down" migration — this system is forward-only; there is no rollback mechanism in the doc.

7. **Sanity-check FK enforcement.** `Database::open()` runs `PRAGMA foreign_keys = ON` before migrations execute, so a new `ON DELETE CASCADE` constraint is live immediately — verify the constraint direction (which side is `child.parent_id → parent(id)`) matches intent before assuming untested cascade behavior is correct.

## Do not

- Do not create the file directly under `src-tauri/migrations/` (sibling of `src/`) — that path does not match the `include_str!` relative path in the registry and will fail to compile. Re-verify against the real `migrations.rs` if one already exists in the repo, since this doc excerpt is self-contradictory.
- Do not add a new table without at least one index unless every query against it is a full scan by primary key.
- Do not add a foreign key without deciding `ON DELETE CASCADE` vs. leaving it unset — the existing schema uses `CASCADE` for both FKs on `asset_tags`; match that unless there's a specific reason (e.g., a FK to `assets(id)` where you want to preserve history rows after an asset is deleted) to omit it.
