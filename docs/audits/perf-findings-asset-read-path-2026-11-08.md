# Performance Findings — Asset Read Path, Backend Perf Rules, and Pagination Fallout

## 1. Metadata

| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Findings record (performance / correctness) |
| **Date** | 2026-11-08 |
| **Git HEAD** | `517f595` |
| **Scope** | `src-tauri/src/storage/database.rs`, `src-tauri/src/meshy/client.rs`, `src-tauri/src/app_state.rs`, `src-tauri/src/commands/*`, `src/hooks/*`, `src/components/gallery/*`, `src/components/common/StatusBar.tsx`, `src/main.tsx`, `src-tauri/migrations/*`, `docs/security_threat_model.md` |
| **Method** | Read-only rule sweep of `docs/coding_standards.md` §13.2 (BPR-01–08) and §6 (`docs/UI_UX_Documentation.md` RND/DAT/PRF), cross-checked against source. Rule gaps established by absence of the required construct. The `ORDER BY` cost was measured with `EXPLAIN QUERY PLAN` plus wall-clock timing on the exact shipping query in an in-memory SQLite database (2000 rows). |
| **Verdict** | **Pass, with one self-inflicted regression (P-01) and one violated security control (P-10).** |
| **Related** | Decisions `D-011`–`D-013` in `.claude/decisions.jsonl`; commit `517f595`; `docs/governance/task-manifest.yaml` (TASK-0025 side finding on `get_storage_usage`). |

## 2. Executive Summary

The asset-list read path was bounded and deduped in `517f595` (new
`get_all_tags` command; `DAT-01` pagination with `list_assets_page` /
`search_assets_page`). This note records what that change left behind, what it
newly caused, and the pre-existing rule gaps found alongside it.

Four items matter:

1. **P-01 — the pagination change introduced an 11× regression on page 1.**
   The `id ASC` tiebreaker added to `ORDER BY created_at DESC` has no matching
   composite index, so SQLite abandons the index's ordering and sorts the whole
   table before taking 50 rows. Correctness-necessary but performance-costly.
2. **P-10 — `BPR-04` is violated, and `security_threat_model.md` claims it as
   an implemented control.** Downloads buffer the entire file in memory with no
   size cap. This is the only item here whose stated security posture is wrong.
3. **P-05 — the same change multiplied mutation refetches.** Seven mutation
   sites invalidate `['assets']` as a prefix match, which now refetches every
   loaded page instead of one query.
4. **P-02/P-03/P-04/P-07/P-08/P-09 — pre-existing rule gaps**, several of them
   one-line omissions (`cache_size`, `pool_max_idle_per_host`, `synchronous`).

## 3. Findings

Severity is impact-if-hit; "Class" distinguishes a regression introduced by
`517f595` from pre-existing drift.

| # | Sev | Class | Rule / FRD | Title | Key evidence | Fix direction |
|---|---|---|---|---|---|---|
| P-01 | High | **Introduced** | BPR-01 (adjacent) | `id ASC` tiebreaker forces a full-table sort per page | `EXPLAIN QUERY PLAN` on the shipping query returns `SCAN assets USING INDEX idx_assets_created` **plus `USE TEMP B-TREE FOR RIGHT PART OF ORDER BY`**. Measured 1.05 ms (current) vs 92 µs with `assets(created_at DESC, id ASC)` — **11×** | Migration 003 adding the composite index |
| P-10 | High | Pre-existing | **BPR-04** | Downloads buffer the whole file in memory, no size cap | `client.rs:135` `response.bytes().await?` then `fs::write` | Stream chunks to disk; cap bytes. Note `security_threat_model.md:156` cites BPR-04 as implemented |
| P-05 | Medium | **Introduced** | DAT-01 | Mutation invalidation now refetches every loaded page | 7 sites with `invalidateQueries({ queryKey: ['assets'] })` (prefix match): `useActiveTaskPolling` ×2, `useDeleteAsset`, `useDownloadAsset`, `useToggleFavorite`, `useUpdateNotes`, `useUpdateTags`. Favoriting on page 3 of 5 ⇒ 5 sequential round trips. `staleTime: 30_000` does not apply; `invalidateQueries` forces refetch | Narrow the query keys, or replace with scoped `setQueryData` — precedent exists at `useApiKey.ts:62,74` |
| P-02 | Medium | Pre-existing | **RND-03 / PRF-06** | Gallery is not virtualized above 100 items | No `@tanstack/react-virtual` dependency; no virtualizer in `AssetGrid.tsx`. `security_threat_model.md:91` cites PRF-06 for the "pathological gallery size freezes the UI thread" DoS row. `gap_assessment_documentation.md:372` records "Grid virtualizes above 100 items" as a Phase 4 gate item | Add the dependency and virtualizer (**needs dependency justification**, DEP-04/PR-06) |
| P-03 | Low | Pre-existing | **FR-EXP-05-F1** | `get_storage_usage` returns a row count, not a byte total | `database.rs:742` `SELECT COUNT(*) FROM assets WHERE downloaded_at > 0` vs FRD: "calculates total size of the assets directory". Compounded: no frontend caller — `StatusBar.tsx:17` hardcodes `const storageUsage = 0` and permanently renders "0 assets" | Sum file sizes; wire `StatusBar` |
| P-04 | Low | Pre-existing | **BPR-08** | No orphaned asset-directory cleanup on startup | `delete_asset` is DB-only ("Does not delete files on disk"); no startup sweep. `lib.rs:332` removes only a *recovery* directory | Startup sweep (destructive — needs a "task id still in DB?" rule) |
| P-06 | Low | Pre-existing | **BPR-02** | SQLite `cache_size` not set | No `cache_size` anywhere in `src-tauri/src` | `PRAGMA cache_size = -64000` |
| P-07 | Low | Pre-existing | **BPR-03** | HTTP pool limit not set | `client.rs:39` `Client::builder().timeout(...)` only | `pool_max_idle_per_host(5)` |
| P-08 | Low | Pre-existing | **BPR-01** (half) | `synchronous` not set, so it defaults to FULL | WAL is set (`database.rs:163`); `synchronous = NORMAL` is not | Add the pragma |
| P-09 | Low | Pre-existing | **BPR-07** | No concurrency cap on downloads | Zero `Semaphore` in `src-tauri/src`; downloads are sequential today | Add a semaphore of 3 — only material once downloads are parallelized |
| P-11 | Info | **Introduced** | DAT-01 | Offset paging is shift-prone | Inserting a newer row shifts later rows down one, so the row at the page boundary can repeat; a delete can skip one | Documented limitation. Offset paging is what the docs specify, so changing it is ADR territory |
| P-12 | Info | **Introduced** | — | `get_all_assets` / `search_assets` lost their frontend callers | Registered in `lib.rs:53-54` and the `tauri.ts` `CommandName` union, but no `invoke('get_all_assets')` remains. Their Rust *method* (`Database::get_all_assets`) still has production callers, so this is command-surface-only | Retire the commands or document them as intentional |

## 4. Evidence Detail

### 4.1 P-01 measurement

`EXPLAIN QUERY PLAN` and wall-clock timing were run against an in-memory
database seeded with 2000 rows. The probe used **exactly the shipping query
shape** — `SELECT * ... ORDER BY created_at DESC, id ASC LIMIT 50 OFFSET 1000`
— because an index can cover `SELECT rowid` but cannot cover `SELECT *`, which
changes both the plan and the cost.

| Variant | Query plan | Time |
|---|---|---|
| Current (as shipped) | `SCAN assets USING INDEX idx_assets_created` + `USE TEMP B-TREE FOR RIGHT PART OF ORDER BY` | 1.053 ms |
| With `assets(created_at DESC, id ASC)` | single index scan, no temp B-tree | 92.4 µs |

Rows were given **distinct** `created_at` values, matching production (per-task
provider timestamps). Note that `make_test_asset` fixes `created_at` for every
row, which would place all rows in one tie group and measure the sorter's worst
case rather than the typical one; any repro must override `created_at` per row
or it will overstate the effect.

**Why the tiebreaker exists.** `created_at` is provider-supplied and can
collide across tasks. With an ambiguous `ORDER BY`, SQLite may return tied rows
in a different order per query, so an offset page can show one row twice while
never showing another. `id ASC` makes the ordering total, which is what makes
offset paging safe. Removing it to recover the index would reintroduce that
correctness bug; the index is the correct fix.

### 4.2 P-05 locality

`invalidateQueries({ queryKey: ['assets'] })` matches by **prefix**, so it
targets `['assets', 'all']` *and* every `['assets', 'page', <search>, <tag>]`
entry. Before `D-012` there was one `['assets', search, tag]` query, so
invalidation was one refetch; after, it is one per loaded page.

The infinite query also has a self-maintaining path: `useActiveTaskPolling`
writes to `taskStore` and `getNextPageParam` derives from the server `total`,
so some of these invalidations may be unnecessary rather than merely
inefficient. `useApiKey.ts:62,74` shows the targeted-`setQueryData` pattern
already used in this codebase; there are no `onMutate` optimistic updates
anywhere, so adding them would introduce a new pattern rather than follow one.

### 4.3 P-10 secures-claim mismatch

`BPR-04` requires file downloads to stream to disk, and
`security_threat_model.md:156` lists BPR-04 among the mapped controls for
"unbounded concurrent downloads exhaust disk space or I/O" — implying it is
implemented. It is not: `response.bytes().await?` materializes the whole
response before `fs::write`. Models can be hundreds of MB, so a single large
asset spikes memory to that size. This is a doc-vs-code contradiction of
exactly the kind `adr-log` exists to surface, not a mere performance nit.

## 5. Verification Method

- Rule gaps: absence of the required construct, confirmed by targeted search
  across `src-tauri/src`, `src/`, `package.json` and `src-tauri/Cargo.toml`.
- P-01: `EXPLAIN QUERY PLAN` output plus timing, as tabulated in §4.1.
- P-05: enumeration of every `invalidateQueries` call site and its key.
- P-03: FRD line 3952 compared against the SQL in `database.rs` and the
  hardcoded `0` in `StatusBar.tsx`.
- Not verified: no end-to-end UI profiler run, so P-02's user-visible impact and
  P-05's per-interaction latency are reasoned from call counts, not measured in
  a running app.

## 6. Recommended Ordering

| Tier | Items | Rationale |
|---|---|---|
| **1** | P-01, P-06, P-07, P-08 | Small, unambiguous, no decisions required. P-01 repairs a regression this branch introduced. **Done.** |
| **2** | P-05, P-10 | Real per-interaction and security wins; each needs a small design choice. **Done.** |
| **3** | P-02, P-04, P-03, P-09, P-12 | Need an owner decision: P-02 adds a dependency, P-04 deletes user files, P-03 touches an FRD contract, P-09 is only material after parallelization, P-12 is cleanup. **Open.** |
| — | P-11 | Documented limitation; changing paging strategy deviates from DAT-01 and would need an ADR. |

**Governance notes.** P-01 is a schema change and must follow the numbered
migration rule (register in `MIGRATIONS`, never edit an applied migration).
P-10 touches download behavior cited by the threat model and P-03 changes an
FRD-stated contract, so both are candidates for `adr-log` / `doc-sync` rather
than drive-by edits.

## 7. Resolution Status

| Item | Status | Resolution |
|---|---|---|
| P-01 | **Resolved** | Migration `003_paged_asset_ordering_index.sql`. `EXPLAIN QUERY PLAN` on the shipping query now returns a single index scan with no temp B-tree; asserted by `paged_list_order_is_served_without_a_sort`. Additive only — `idx_assets_created` deliberately left in place. |
| P-06 | **Resolved** | `PRAGMA cache_size = -64000` in `Database::open`. |
| P-07 | **Resolved** | `.pool_max_idle_per_host(5)` on `MeshyClient`'s builder. |
| P-08 | **Resolved** | `PRAGMA synchronous = NORMAL` in `Database::open` (file-backed path, matching where `journal_mode` is set). |
| P-05 | **Resolved** | New shared `src/hooks/assetQueryKeys.ts`. Field mutations (`toggle_favorite`, `update_notes`, `update_tags`, `download_asset`) patch the affected rows in cache; `delete_asset` patches then invalidates; `save_completed_task` invalidates lists and tags. Measured: the old blanket key matched 3 cached queries (3 refetches) where the patch updates the same 3 entries with 0 fetches. Also closed a separate defect — nothing invalidated `['all-tags']`, so the tag filter went stale after a tag edit. |
| P-10 | **Resolved** | `download_file` now streams in chunks via `response.bytes_stream()` with a 2 GiB cap (`MAX_DOWNLOAD_BYTES`), enforced by both a `Content-Length` pre-check and a running total, with the partial file removed on every failure path. New `DownloadTooLarge` error survives the provider boundary as `DOWNLOAD_TOO_LARGE` at the IPC edge. Satisfies the BPR-04 control `security_threat_model.md` §"Denial of Service" already claimed as implemented. |
| P-02, P-03, P-04, P-09, P-12 | Open | Tier 3 (see below). |
| P-11 | Open (by design) | Documented limitation. |

Decisions `D-014`–`D-019` in `.claude/decisions.jsonl` record these choices.

**Parked pending an owner decision (`D-019`).** P-02 (virtualization) was left
undone because it requires adding `@tanstack/react-virtual`, and DEP-04/PR-06
justification is the owner's call rather than a side effect of a performance
sweep. P-04 (orphan-directory cleanup) was left undone because it deletes user
files from disk and needs a product rule for whether a task id still referenced
is safe to sweep. Both are recorded here as open, not silently dropped.

**A note on what the P-05 tests changed.** The first implementation read
`queryClient.getQueryData(['assets','page'])` to find the paginated entries.
`getQueryData` resolves by the **exact** serialized `queryHash`
(`query-core/build/modern/queryClient.js:68-71`), so that prefix could never
match `['assets','page','',null]` — the paginated branch was a silent no-op and
would have shipped as "the gallery shows stale data, with no error". The
paginated cases in `assetQueryKeys.test.ts` failed and caught it. The helper now
iterates `getQueryCache().findAll({ queryKey: ['assets'] })` by prefix and
discriminates on shape (`isInfiniteAssetData`), which also covers every filter's
page set and patches a row that appears on two loaded pages.

One consequence worth noting: migration 003 changed which failure a
*spoofed, un-migratable* backup restore hits, from `BACKUP_SCHEMA_MISMATCH` to
`BACKUP_MIGRATION_FAILED`. Both paths fail closed with the live database
byte-identical and nothing quarantined, so it was a test-expectation
correction rather than a behavior regression; `D-016` covers it, and the
affected test no longer hardcodes a schema version that will rot.
