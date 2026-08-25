# Test Plan — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Test Plan |
| **Version** | 1.0.0 |
| **Date** | 2026 |
| **Status** | Reference (produced per project decision, overriding Documentation Gap Assessment v1.0.0 Gap 7) |
| **Dependencies** | FRD v1.0.0 §5 (acceptance criteria, canonical source), CSD v1.0.0 §11 (testing standards), UI/UX v1.0.0 §13 (quality gates) |

---

## 1. Purpose and Scope

### 1.1 Why This Document Exists

The Documentation Gap Assessment (v1.0.0, Gap 7) evaluated whether MeshyForge needed a standalone Test Plan and recommended against generating one, on the grounds that the Feature Requirements Document (FRD) §5 already expresses every feature's expected behavior as Given/When/Then acceptance criteria, and that a separate test plan would be a redundant restatement of the same information in a different shape. That reasoning is still correct as a statement about *information content*: the FRD's acceptance criteria remain the single canonical source of truth for what "correct" means for every one of MeshyForge's features. Nothing in this document supersedes, amends, or reinterprets an FRD acceptance criterion. Where this document appears to add detail (e.g., naming a specific test file, mock, or assertion strategy), that detail is an implementation suggestion consistent with CSD §11 and UI/UX §13, not a new requirement.

What this document adds is *shape*: acceptance criteria in the FRD are grouped by feature and written in prose form for readability; a test-writing engineer instead needs a checklist — one row per test, with a name, a classification (unit / component / E2E), and a pointer back to the requirement it verifies — organized by the six build phases in the Implementation Execution Plan (IEP) so that a phase's exit criteria are visible in one place. That reshaping is the entire value of this document. The project owner has explicitly requested it be produced despite the gap assessment's recommendation, and it is provided here on that basis.

### 1.2 Scope

This plan covers every feature specified in FRD §5 — all features from FR-INF-01 through FR-EXP-05, spanning Phase 0 (Scaffold) through Phase 5 (Polish). It does **not** introduce new functional requirements, new acceptance thresholds, or new NFR targets; every numeric threshold, error code, and control name used below is carried over verbatim from the FRD, CSD, TDD, or UI/UX documents.

**A note on the feature count.** The task that produced this document (and the FRD's own §4.2/§4.3 summary tables) refers to "65 features." The FRD's §4.1 Feature Summary table, walked row by row, actually lists **76** distinct feature IDs (FR-INF-01 through FR-EXP-05) — the §4.2 "Total: 65" and §4.3 per-phase counts (e.g., "Phase 2: 7", "Phase 5: 3") do not match the number of rows actually present in §4.1, nor the number of `####`-level feature specifications actually written out in §5. This appears to be an arithmetic error already present in the FRD (a pre-existing documentation defect, not something introduced by this test plan). Rather than silently drop 11 features to hit the number "65," this test plan covers **all 76 features that FRD §5 actually specifies**, since every one of them has a real acceptance-criteria block that needs test coverage. Section 9.3 restates this discrepancy for visibility.

### 1.3 What "Passing" Means

A test case in this plan is considered a faithful implementation of its source acceptance criterion when it exercises the exact GIVEN precondition, triggers the exact WHEN action, and asserts the exact THEN outcome named in FRD §5. Test cases derived from **Functional Requirements** (`FR-xxx-Fn` rows) rather than a GIVEN/WHEN/THEN block follow the same standard, treating the functional requirement's stated behavior as the THEN outcome.

---

## 2. Test Case Naming and Classification Conventions

### 2.1 Naming (per CSD §11.2)

- **TST-01 / TST-02**: test names describe behavior, not implementation, and start with a verb-shaped clause ("disables", "shows", "calls", "returns"). This plan's test **names** (the `snake_case` identifiers, e.g., `text_to_3d_panel__generate_button_disabled_when_prompt_empty`) map 1:1 to the `it('...')` description CSD expects in the corresponding test file — read the underscores as spaces and the description falls out directly.
- **TST-03**: tests are grouped by feature below, which stands in for CSD's `describe` grouping ("rendering", "validation", "generation", "error handling", "accessibility") — each feature's test table is the checklist for that feature's `describe` block(s).
- **TST-04 – TST-10**: one primary assertion per test, `userEvent` over `fireEvent`, no `console.log`, `invoke` mocked at module level, no snapshot tests, effect cleanups tested explicitly, Rust tests use `#[tokio::test]`. These are authoring rules for whoever writes the test file; this plan's job is to enumerate *what* to write, not restate *how* — see CSD §11.1–§11.3 for the file-structure and mock patterns to follow verbatim.

### 2.2 Classification

Every test case below is tagged with one of four types, chosen by where the behavior actually lives and what UI/UX §13.1's automated gates and §13.2's manual gates expect to catch it:

| Type | Tag | Tooling | Used for |
|---|---|---|---|
| **Rust unit test** | `RUST` | `cargo test`, `#[tokio::test]`, `wiremock` for HTTP, tempdir for filesystem (CSD §11.3) | Backend-only logic: `MeshyClient`, SQLite queries, file storage, keychain — anything in `src-tauri/` with no UI surface |
| **React component test** | `RTL` | Vitest + Testing Library + `userEvent`, `invoke` mocked (CSD §11.1) | Component rendering, form validation, state transitions, accessibility attributes — anything that can be verified against a mocked IPC boundary without a real backend or real GPU |
| **Playwright E2E test** | `E2E` | Playwright + Tauri WebDriver (TSS §9, full app flows) | Cross-process behavior that only exists when frontend and backend are both real: full generate→poll→download→gallery workflows, OS-level interactions (file dialogs, keychain, notifications), and the camera/WebGL interactions that jsdom cannot execute |
| **CI/Build Gate** | `GATE` | Biome, `tsc`, Clippy, `rustfmt`, `cargo audit`, bundle analyzer (UI/UX §13.1) | Acceptance criteria that are really statements about the toolchain/pipeline itself, not runtime behavior of a component |

Coverage targets (CSD §11.4, restated for reference, not redefined here): `src/components/` ≥ 70% lines, `src/hooks/` ≥ 80%, `src/lib/` ≥ 90%, `src/stores/` ≥ 80%, `src-tauri/src/meshy/` ≥ 80%, `src-tauri/src/storage/` ≥ 80%, `src-tauri/src/commands/` ≥ 60%, `src-tauri/src/security/` ≥ 50%. Frontend test suite overall must hit ≥ 70% lines / ≥ 70% functions per UI/UX §13.1.

### 2.3 Test ID Scheme

Each test case ID is `TC-<domain>-<feature-number>-<sequence>`, e.g. `TC-GEN-01-03` is the 3rd test case for feature `FR-GEN-01`. The FRD feature ID is always recoverable by dropping the leading `TC-` and trailing sequence number, so every test case is self-citing back to its FRD source — no separate traceability column is needed, but the acceptance-criteria excerpt is included for readability.

---

## 3. Phase 0 — Project Scaffold: Test Cases

### FR-INF-01: Project Scaffold and Build System (Must · Phase 0)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-01-01 | `app_shell__launches_within_three_seconds_on_all_platforms` | E2E | App window opens showing the shell within ≤3s (NFR-INF-01-1) |
| TC-INF-01-02 | `ci_lint__biome_reports_zero_errors` | GATE | `npm run lint` → Biome 0 errors |
| TC-INF-01-03 | `ci_typecheck__tsc_reports_zero_errors` | GATE | `npx tsc --noEmit` → 0 errors |
| TC-INF-01-04 | `ci_rust_lint__clippy_reports_zero_warnings` | GATE | `cargo clippy -- -D warnings` → 0 warnings |
| TC-INF-01-05 | `ci_pipeline__passes_on_ubuntu_windows_and_macos` | GATE | CI green on all 3 platform runners on push |
| TC-INF-01-06 | `bundle__initial_js_is_under_300kb_gzipped` | GATE | NFR-INF-01-2, bundle analyzer check |

### FR-INF-02: Tauri IPC Contract Layer (Must · Phase 0)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-02-01 | `codebase__has_no_tauri_core_imports_outside_lib_tauri_ts` | GATE | Grep/lint rule finds zero imports of `@tauri-apps/api/core` outside `src/lib/tauri.ts` (CTR-07) |
| TC-INF-02-02 | `invoke__wraps_command_error_string_as_meshy_frontend_error` | RTL | `invoke<T>()` catches a thrown error string and rethrows a `MeshyFrontendError` with `code`/`message`/`details` |
| TC-INF-02-03 | `parse_error__falls_back_to_unknown_code_when_error_is_not_json` | RTL | `parseError()` returns `{code:'UNKNOWN', message: error}` when JSON.parse fails |
| TC-INF-02-04 | `asset_url__returns_valid_asset_protocol_url_for_local_path` | RTL | `assetUrl(path)` calls `convertFileSrc()` and returns an `asset://` URL |

### FR-INF-08: CI/CD Pipeline (Must · Phase 0)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-08-01 | `ci_workflow__runs_lint_typecheck_vitest_clippy_rustfmt_and_build_on_push` | GATE | `ci.yml` job matrix runs all listed checks on push/PR |
| TC-INF-08-02 | `release_workflow__builds_installers_for_four_targets_on_tag_push` | GATE | Tag `v1.0.0` push triggers matrix build (macOS arm64+x86_64, Windows x64, Linux x64) and creates a GitHub Release with installers attached |
| TC-INF-08-03 | `audit_workflow__runs_npm_audit_and_cargo_audit_weekly` | GATE | `audit.yml` scheduled trigger runs both audits |

**Phase 0 subtotal: 3 features, 13 test cases.**

---

## 4. Phase 1 — Backend Foundation: Test Cases

### FR-INF-03: SQLite Database and Migrations (Must · Phase 1)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-03-01 | `database__creates_file_and_all_tdd_tables_on_first_launch` | RUST | First launch creates `meshyforge.db` at the platform app-data path with all §6.1 tables and `schema_version` recording migration 1 |
| TC-INF-03-02 | `database__does_not_reapply_migrations_on_relaunch_and_retains_data` | RUST | Relaunch skips already-applied migrations; prior data intact |
| TC-INF-03-03 | `get_all_assets__returns_inserted_record_with_all_fields_populated` | RUST | `insert_asset()` + `get_all_assets()` round-trip |
| TC-INF-03-04 | `search_assets__matches_query_against_prompt_and_notes` | RUST | `search_assets("monster", None)` returns matching rows |
| TC-INF-03-05 | `database__opens_with_wal_mode_and_configured_pragmas` | RUST | WAL, `synchronous=NORMAL`, `foreign_keys=ON`, `cache_size=-64000`, `temp_store=MEMORY` set |
| TC-INF-03-06 | `database__connection_is_guarded_by_mutex_for_concurrent_access` | RUST | Concurrent calls through `Mutex<Connection>` do not race/panic (NFR-INF-03-3) |
| TC-INF-03-07 | `update_tags__clears_and_reinserts_asset_tags_and_updates_tags_json` | RUST | `update_tags()` behavior per FR-INF-03-F10 |
| TC-INF-03-08 | `delete_asset__removes_asset_and_its_asset_tags_rows` | RUST | `delete_asset()` cascades to `asset_tags` |

### FR-INF-04: Meshy API HTTP Client (Rust) (Must · Phase 1)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-04-01 | `create_task__returns_task_id_on_success` | RUST | `create_task("/v2/text-to-3d", body)` → `TaskCreateResponse` (wiremock) |
| TC-INF-04-02 | `get_task__returns_full_task_object_json` | RUST | `get_task(endpoint, task_id)` GET round-trip |
| TC-INF-04-03 | `download_file__streams_response_to_disk_and_returns_byte_count` | RUST | `download_file(url, dest)` writes file, returns size, does not buffer fully in memory (BPR-04) |
| TC-INF-04-04 | `stream_task__invokes_callback_per_sse_event_and_returns_on_terminal_status` | RUST | `stream_task()` parses `data:` lines, calls `on_event`, exits loop on terminal status |
| TC-INF-04-05 | `get_balance__returns_balance_response_for_valid_key` | RUST | `get_balance()` GET `/v1/balance` |
| TC-INF-04-06 | `create_task__maps_http_402_to_api_error_variant_with_status_and_body` | RUST | `MeshyError::ApiError{status:402,..}` on 402 response |
| TC-INF-04-07 | `meshy_client__uses_rustls_and_120s_download_10s_connect_timeouts` | RUST | Client construction config (NFR-INF-04-1, NFR-INF-04-3) |
| TC-INF-04-08 | `meshy_client__methods_never_panic_via_unwrap_or_expect` | GATE | Clippy/code-review rule: no `unwrap()`/`expect()` in client code (RST-01) |

### FR-INF-05: File System Asset Storage (Must · Phase 1)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-05-01 | `download_asset__creates_task_directory_with_model_thumbnail_and_textures` | RUST | Directory layout `{app_data}/assets/{task_id}/` with `model.{fmt}`, `thumbnail.png`, `textures/` |
| TC-INF-05-02 | `download_asset__updates_sqlite_record_with_local_file_paths` | RUST | SQLite row reflects downloaded paths after download |
| TC-INF-05-03 | `startup__deletes_orphaned_asset_directories_not_present_in_sqlite` | RUST | Orphan cleanup on app startup |
| TC-INF-05-04 | `download_asset__limits_concurrent_downloads_to_three_via_semaphore` | RUST | BPR-07 semaphore caps concurrency at 3 |

### FR-INF-06: OS Keychain Integration (Must · Phase 1)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-06-01 | `set_api_key__stores_key_in_os_keychain_under_meshyforge_service` | RUST | `store_key()` writes to `keyring::Entry` for service `com.meshyforge.app` |
| TC-INF-06-02 | `get_api_key__returns_none_when_no_key_is_stored` | RUST | `get_key()` returns `Option::None` |
| TC-INF-06-03 | `api_key__never_appears_in_sqlite_or_log_output` | RUST | Inspect DB file and log stream after storing a key; key absent (SEC-01, SEC-04) |
| TC-INF-06-04 | `set_api_key__falls_back_to_0600_file_on_linux_without_secret_service` | RUST | Linux fallback path and permission bits |

### FR-INF-07: Tauri Command Registration (Must · Phase 1)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-INF-07-01 | `invoke_get_credit_balance__returns_balance_through_registered_command` | E2E | Real IPC round trip through `generate_handler!` registration |
| TC-INF-07-02 | `invoke_create_text_to_3d__validates_input_before_calling_meshy_api` | RUST | Command-level input validation (IPC-04, VAL-01) short-circuits invalid bodies before HTTP call |
| TC-INF-07-03 | `app_state__lazily_constructs_meshy_client_from_keychain_key_on_first_use` | RUST | `AppState` defers `MeshyClient` construction until first command needing it |

**Phase 1 subtotal: 5 features, 27 test cases.**

---

## 5. Phase 2 — Core UI Shell: Test Cases

### FR-KEY-01: API Key Entry and Validation (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-KEY-01-01 | `settings__shows_api_key_input_and_validate_button_on_first_launch` | RTL | First-launch Settings renders masked-off input + Validate button |
| TC-KEY-01-02 | `validate__on_success_stores_key_and_shows_balance_success_toast` | RTL | Success path stores key via `set_api_key`, shows toast with balance |
| TC-KEY-01-03 | `validate__on_failure_shows_invalid_key_error_toast_and_does_not_store` | RTL | 401-style failure → "API key invalid or expired" toast, no storage |
| TC-KEY-01-04 | `settings__shows_masked_placeholder_and_delete_button_when_key_already_stored` | RTL | Returning to Settings with a stored key shows `msy_••••••••` + Delete Key |
| TC-KEY-01-05 | `validate_button__disabled_with_spinner_while_validation_in_flight` | RTL | Button disabled state during mutation (FR-KEY-01-F9) |
| TC-KEY-01-06 | `delete_key__clears_stored_key_via_delete_key_command` | RTL | Delete Key button calls `delete_key` and clears local state |

### FR-KEY-02: API Key Persistence (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-KEY-02-01 | `app_launch__initializes_meshy_client_from_stored_key_with_no_prompt` | E2E | Restart with stored key skips prompt, shows balance in TopBar |
| TC-KEY-02-02 | `app_launch__shows_no_api_key_empty_states_in_gallery_and_generate_when_key_absent` | RTL | No-key state renders empty states with link to Settings |

### FR-KEY-03: Credit Balance Display (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-KEY-03-01 | `topbar__displays_current_credit_balance_as_number_on_load` | RTL | `useCreditBalance` renders formatted integer |
| TC-KEY-03-02 | `credit_balance__refreshes_within_five_seconds_of_task_creation` | RTL | Query invalidation after task-create mutation |
| TC-KEY-03-03 | `credit_balance__auto_refetches_every_sixty_seconds_while_focused` | RTL | `refetchInterval: 60000` behavior under fake timers |
| TC-KEY-03-04 | `credit_balance__refetches_immediately_on_window_focus_regain` | RTL | `refetchOnWindowFocus` triggers refetch |
| TC-KEY-03-05 | `credit_balance__shows_zero_credits_in_warning_color_when_balance_is_zero` | RTL | `text-warning` styling for 0 balance |
| TC-KEY-03-06 | `credit_balance__shows_dash_and_tooltip_when_balance_query_fails` | RTL | Failure fallback UI |
| TC-KEY-03-07 | `credit_balance__has_aria_live_polite_for_screen_reader_updates` | RTL | SEM-12 accessibility attribute present |

### FR-KEY-04: Credit Balance Auto-Refresh (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-KEY-04-01 | `task_creation_mutation__invalidates_credit_balance_query_in_on_success` | RTL | Every creation mutation's `onSuccess` calls `invalidateQueries(['credit-balance'])` |
| TC-KEY-04-02 | `window_focus_event__triggers_immediate_balance_refetch` | RTL | Focus-regain path (duplicate-verifies KEY-03-04 from the mutation-trigger angle) |

### FR-SET-01: Application Shell Layout (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-SET-01-01 | `app_shell__renders_topbar_sidebar_content_and_statusbar_with_correct_heights` | RTL | `h-14` TopBar, `w-56` Sidebar, flexible content, `h-8` StatusBar (LAY-01–LAY-05) |
| TC-SET-01-02 | `sidebar__auto_collapses_to_icon_width_below_1280px_viewport` | RTL | RES-01 responsive collapse at threshold |
| TC-SET-01-03 | `scrollable_areas__use_shadcn_scrollarea_component` | RTL | LAY-06 compliance spot-check on a representative scrollable panel |

### FR-SET-02: Sidebar Navigation (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-SET-02-01 | `sidebar_nav__clicking_gallery_switches_content_and_highlights_active_item` | RTL | `setActiveView` + accent highlight |
| TC-SET-02-02 | `sidebar_nav__collapse_toggle_shrinks_sidebar_to_icon_only_width` | RTL | Toggle behavior |
| TC-SET-02-03 | `sidebar_nav__collapsed_icon_shows_tooltip_with_full_label_on_hover` | RTL | Tooltip content when collapsed |
| TC-SET-02-04 | `sidebar_nav__tab_key_moves_focus_to_first_item_with_visible_ring` | RTL | Keyboard focus order + focus-visible ring |
| TC-SET-02-05 | `sidebar_nav__has_role_navigation_and_labeled_items` | RTL | SEM-05 role/aria-label compliance |

### FR-SET-03: User Preferences Panel (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-SET-03-01 | `preferences__renders_all_sixteen_settings_controls_from_tdd` | RTL | All 16 TDD §16.1 controls present |
| TC-SET-03-02 | `preferences__changing_a_value_persists_to_localstorage_and_becomes_form_default` | RTL | Zustand `persist` middleware round trip |
| TC-SET-03-03 | `preferences__reset_to_defaults_restores_all_values_from_tdd_defaults` | RTL | `resetToDefaults()` action |
| TC-SET-03-04 | `poll_interval_slider__respects_1000ms_min_60000ms_max_1000ms_step` | RTL | Slider bounds |
| TC-SET-03-05 | `preferences__every_control_has_a_label_and_help_tooltip` | RTL | FRM-01 accessibility spot-check |

### FR-SET-04: About and API Status Panel (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-SET-04-01 | `about_panel__displays_app_name_version_and_status_and_docs_links` | RTL | Static content rendering |
| TC-SET-04-02 | `about_panel__status_and_docs_links_open_in_default_browser_via_shell_plugin` | E2E | Tauri shell plugin external-open behavior |
| TC-SET-04-03 | `refresh_api_spec__fetches_llms_txt_and_compares_to_bundled_spec` | RTL | Refresh button triggers fetch+diff per TDD §17 |

### FR-NOTIF-02: Toast Notifications for User Actions (Must · Phase 2)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-NOTIF-02-01 | `task_creation__shows_auto_dismissing_success_toast_with_credits_deducted_message` | RTL | 3s auto-dismiss toast text |
| TC-NOTIF-02-02 | `asset_download__shows_success_toast_asset_downloaded_to_local_storage` | RTL | Download success toast |
| TC-NOTIF-02-03 | `asset_export__shows_success_toast_with_format_and_destination_path` | RTL | Export success toast (5s dismiss) |
| TC-NOTIF-02-04 | `toast_container__renders_at_root_with_aria_live_polite` | RTL | SEM-07 + z-index-100 mount point |

**Phase 2 subtotal: 9 features, 32 test cases.**

---

## 6. Phase 3 — Generation Workflows: Test Cases

### FR-GEN-01: Text to 3D Preview Generation (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GEN-01-01 | `text_to_3d_panel__generate_click_posts_preview_mode_and_creates_task` | RTL | Submit → POST `/v2/text-to-3d` `mode:"preview"`, task appears in monitor, balance updates |
| TC-GEN-01-02 | `text_to_3d_panel__generate_button_disabled_when_prompt_empty` | RTL | Disabled state + "Enter a prompt to generate" tooltip |
| TC-GEN-01-03 | `text_to_3d_panel__prompt_over_600_chars_shows_inline_length_error` | RTL | Inline validation message |
| TC-GEN-01-04 | `text_to_3d_panel__renders_all_documented_generation_controls` | RTL | Full control inventory (model, type, remesh, topology, polycount, pose, moderation, formats, auto-size, alpha) |
| TC-GEN-01-05 | `text_to_3d_panel__generate_button_shows_spinner_and_is_disabled_during_mutation` | RTL | Double-submit prevention (NFR-GEN-01-1) |
| TC-GEN-01-06 | `text_to_3d_panel__format_checkboxes_are_wrapped_in_labeled_fieldset` | RTL | FRM-07 semantics |

### FR-GEN-02: Text to 3D Refine (Texturing) (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GEN-02-01 | `refine_form__prefills_preview_task_id_and_shows_texturing_controls` | RTL | Form population from a succeeded preview task |
| TC-GEN-02-02 | `refine_form__generate_texture_click_posts_refine_mode_with_preview_task_id` | RTL | POST body correctness |
| TC-GEN-02-03 | `refine_form__refine_button_disabled_until_preview_task_succeeds` | RTL | Disabled + tooltip "Wait for preview to complete first" |

### FR-GEN-03: Image to 3D Generation (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GEN-03-01 | `image_to_3d_panel__dropped_image_is_loaded_and_shown_as_preview` | RTL | Drop → preview render |
| TC-GEN-03-02 | `image_to_3d_panel__generate_converts_image_to_data_uri_and_posts_to_image_to_3d` | RTL | `read_file_as_data_uri` + POST `/v1/image-to-3d` |
| TC-GEN-03-03 | `image_to_3d_panel__ultra_mode_toggle_visible_only_for_meshy7_or_latest` | RTL | Conditional field visibility |
| TC-GEN-03-04 | `image_to_3d_panel__smart_topology_shows_t1_t2_selector_and_100_15000_polycount_range` | RTL | Conditional field set |

### FR-GEN-04: Multi-Image to 3D Generation (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GEN-04-01 | `multi_image_panel__uploading_one_to_four_images_shows_thumbnails_and_enables_generate` | RTL | Grid render + enabled state |
| TC-GEN-04-02 | `multi_image_panel__fifth_image_upload_rejected_with_maximum_four_toast` | RTL | Upper-bound enforcement |
| TC-GEN-04-03 | `multi_image_panel__generate_posts_multi_image_to_3d_with_image_urls` | RTL | POST body with image array |

### FR-GEN-05: Image Upload via Drag-and-Drop (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GEN-05-01 | `dropzone__dragover_with_image_file_highlights_border_accent` | RTL | DND-01 visual state |
| TC-GEN-05-02 | `dropzone__dropped_image_converts_to_data_uri_and_displays_preview` | RTL | Drop handling |
| TC-GEN-05-03 | `dropzone__dragover_with_non_image_file_shows_not_allowed_cursor_and_toast` | RTL | Rejection path |
| TC-GEN-05-04 | `dropzone__enter_key_on_focused_dropzone_opens_file_dialog` | RTL | FRM-09 keyboard access |

### FR-GEN-06: Image Upload via File Dialog (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GEN-06-01 | `upload_button__opens_os_file_dialog_filtered_to_image_types` | RTL | Tauri dialog `open()` call with image filter |
| TC-GEN-06-02 | `upload_button__selected_file_converts_to_data_uri_and_displays_preview` | RTL | Selection → preview |

### FR-GEN-07: Generation Form Controls (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GEN-07-01 | `model_selector__defaults_to_saved_preference_across_all_generation_panels` | RTL | Shared-control default sourcing |
| TC-GEN-07-02 | `format_checkboxes__prechecked_from_saved_default_target_formats` | RTL | Preference-driven pre-check |
| TC-GEN-07-03 | `polycount_slider__displays_current_value_and_exposes_aria_valuenow_min_max` | RTL | FRM-06 slider semantics |

### FR-POST-01: Remesh (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-POST-01-01 | `remesh_form__selecting_asset_enables_form_with_documented_controls` | RTL | Control inventory (formats, topology, polycount, decimation, alpha) |
| TC-POST-01-02 | `remesh_form__submit_posts_to_remesh_endpoint_and_links_parent_task_id` | RTL | POST `/v1/remesh`, task's `parent_task_id` set |

### FR-POST-02: Retexture (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-POST-02-01 | `retexture_form__accepts_text_style_prompt_as_style_input` | RTL | Text-prompt path |
| TC-POST-02-02 | `retexture_form__accepts_image_style_url_as_style_reference` | RTL | Image-URL path |
| TC-POST-02-03 | `retexture_form__enforces_exactly_one_style_input_text_image_or_multiview` | RTL | Mutual exclusivity (FR-POST-02-F1) |
| TC-POST-02-04 | `retexture_form__multiview_urls_available_only_for_meshy7_or_latest` | RTL | Conditional field |

### FR-POST-03: Convert Format (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-POST-03-01 | `convert_form__selecting_target_formats_enables_convert_button` | RTL | At-least-one-format validation |
| TC-POST-03-02 | `convert_form__submit_posts_to_convert_endpoint_and_creates_task` | RTL | POST `/v1/convert` |

### FR-POST-04: Resize Model (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-POST-04-01 | `resize_form__entering_resize_height_enables_resize_button` | RTL | Height-mode enable |
| TC-POST-04-02 | `resize_form__auto_size_mode_uses_ai_vision_estimated_height` | RTL | Auto-size flag |
| TC-POST-04-03 | `resize_form__enforces_exactly_one_resize_mode` | RTL | `resize_height` / `resize_longest_side` / `auto_size` mutual exclusivity |

### FR-POST-05: UV Unwrap (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-POST-05-01 | `uv_unwrap_form__submit_posts_to_uv_unwrap_endpoint` | RTL | POST `/v1/uv-unwrap` |
| TC-POST-05-02 | `uv_unwrap_form__shows_40000_face_warning_and_suggests_remesh_first` | RTL | Warning text present |

### FR-POST-06: Auto-Rigging (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-POST-06-01 | `rigging_form__submit_with_height_posts_to_rigging_endpoint` | RTL | POST `/v1/rigging` |
| TC-POST-06-02 | `rigging_form__rig_button_disabled_when_face_count_exceeds_300000` | RTL | Face-limit gate + tooltip |
| TC-POST-06-03 | `rigging_task__succeeded_result_contains_rigged_and_walk_run_animation_urls` | RTL | Result shape assertion |

### FR-POST-07: Animation Preset Application (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-POST-07-01 | `animation_panel__loads_searchable_library_of_500_plus_presets` | RTL | Library fetch + render |
| TC-POST-07-02 | `animation_panel__searching_walk_filters_list_to_matching_animations` | RTL | Search/filter behavior |
| TC-POST-07-03 | `animation_panel__apply_posts_rig_task_id_and_action_id_to_animations_endpoint` | RTL | POST `/v1/animations` |
| TC-POST-07-04 | `animation_library_query__uses_infinite_stale_time_cache` | RTL | DAT-06 caching config |

### FR-IMG-01: Text to Image Generation (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-IMG-01-01 | `text_to_image_panel__submit_posts_to_text_to_image_endpoint` | RTL | POST `/v1/text-to-image` |
| TC-IMG-01-02 | `text_to_image_panel__multiview_toggle_returns_three_image_urls_on_success` | RTL | Multi-view result shape |
| TC-IMG-01-03 | `text_to_image_panel__aspect_ratio_restricted_to_1x1_3x2_2x3_for_gpt_image_2` | RTL | Model-conditional options |
| TC-IMG-01-04 | `text_to_image_panel__aspect_ratio_selector_disabled_when_multiview_enabled` | RTL | Mutual-exclusion UI state |

### FR-IMG-02: Image to Image Transformation (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-IMG-02-01 | `image_to_image_subtab__shows_model_prompt_upload_and_aspect_controls` | RTL | Control inventory |
| TC-IMG-02-02 | `image_to_image_subtab__submit_with_1_to_5_reference_images_posts_to_image_to_image` | RTL | POST `/v1/image-to-image` |

### FR-PRINT-01: Multi-Color 3D Print Conversion (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-PRINT-01-01 | `multi_color_form__set_max_colors_and_convert_posts_to_print_multi_color_endpoint` | RTL | POST `/v1/print/multi-color`, `max_colors` 1–16 |
| TC-PRINT-01-02 | `multi_color_task__succeeded_result_returns_3mf_file_url` | RTL | Result shape |

### FR-PRINT-02: Analyze Printability (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-PRINT-02-01 | `analyze_form__click_analyze_posts_to_print_analyze_endpoint` | RTL | POST `/v1/print/analyze` |
| TC-PRINT-02-02 | `analyze_result__displays_status_badge_issue_count_and_metrics_table` | RTL | Result rendering (status/watertight/volume/edges/faces/holes) |

### FR-PRINT-03: Repair Printability (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-PRINT-03-01 | `repair_form__click_repair_posts_to_print_repair_endpoint` | RTL | POST `/v1/print/repair` |
| TC-PRINT-03-02 | `repair_task__output_format_matches_input_format` | RTL | Format parity |
| TC-PRINT-03-03 | `repair_form__shows_warning_that_existing_textures_are_removed` | RTL | Warning text present |

### FR-CLAB-01: Creative Lab — Keychain (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-CLAB-01-01 | `creative_lab_keychain__selecting_keychain_and_uploading_photo_shows_prototype_form` | RTL | Prototype form render |
| TC-CLAB-01-02 | `creative_lab_keychain__prototype_success_shows_concept_image_and_build_button` | RTL | Two-stage transition |
| TC-CLAB-01-03 | `creative_lab_keychain__build_form_exposes_all_fourteen_geometry_options` | RTL | Build option inventory |
| TC-CLAB-01-04 | `creative_lab_keychain__succeeded_build_returns_model_url_in_selected_format` | RTL | Result shape (glb/obj-zip/zip) |

### FR-CLAB-02: Creative Lab — Fridge Magnet (Must · Phase 3)

*No explicit GIVEN/WHEN/THEN block in FRD §5 — a single high-level acceptance criterion plus functional requirements only; test cases below are derived from the functional requirements and the shared FR-CLAB-01 workflow it explicitly reuses.*

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-CLAB-02-01 | `creative_lab_fridge_magnet__prototype_and_build_flow_returns_3d_model` | E2E | Full two-stage workflow end to end |
| TC-CLAB-02-02 | `creative_lab_fridge_magnet__build_defaults_use_fridge_magnet_specific_geometry` | RTL | Defaults: rounded-rect, 60mm, 3.3mm relief, 2mm base |

### FR-CLAB-03: Creative Lab — Figure (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-CLAB-03-01 | `creative_lab_figure__prototype_generates_chibi_style_concept_image` | RTL | Prototype stage output |
| TC-CLAB-03-02 | `creative_lab_figure__build_returns_glb_obj_and_mtl_outputs` | RTL | Build result shape |

### FR-CLAB-04: Creative Lab — Vinyl Figure (Must · Phase 3)

*No explicit GIVEN/WHEN/THEN block in FRD §5 (description + functional requirements only).*

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-CLAB-04-01 | `creative_lab_vinyl_figure__prototype_and_build_flow_returns_3d_model` | E2E | Full two-stage workflow, vinyl-figure styling |

### FR-CLAB-05: Creative Lab — Brick Figure (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-CLAB-05-01 | `creative_lab_brick_figure__prototype_and_build_flow_returns_3d_model` | E2E | Full two-stage workflow, brick-figure styling |
| TC-CLAB-05-02 | `creative_lab_brick_figure__prototype_returns_403_when_image_flagged_for_ip_violation` | RTL | IP-violation error path (FR-CLAB-05-F2) |

### FR-CLAB-06: Creative Lab — Lamp (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-CLAB-06-01 | `creative_lab_lamp__prototype_accepts_exactly_one_of_text_or_image_input` | RTL | Mutual exclusivity |
| TC-CLAB-06-02 | `creative_lab_lamp__image_input_allows_character_or_landscape_subject_selection` | RTL | `image_subject` selector |
| TC-CLAB-06-03 | `creative_lab_lamp__build_form_exposes_ten_geometry_options_and_output_format` | RTL | Build option inventory |

### FR-CLAB-07: Creative Lab — Keycap (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-CLAB-07-01 | `creative_lab_keycap__generate_prototype_returns_design_render_and_candidate_id` | RTL | Prototype output shape |
| TC-CLAB-07-02 | `creative_lab_keycap__build_requires_input_task_id_and_candidate_id` | RTL | Required-field validation |
| TC-CLAB-07-03 | `creative_lab_keycap__build_returns_402_when_user_is_on_free_plan` | RTL | Payment-required error path |
| TC-CLAB-07-04 | `creative_lab_keycap__succeeded_build_returns_glb_obj_zip_and_process_images_at_mm_scale` | RTL | Result shape |

### FR-TASK-01: Task Creation and Tracking (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TASK-01-01 | `task_monitor__submitting_form_adds_task_card_with_pending_status_and_zero_progress` | RTL | Initial task card state |
| TC-TASK-01-02 | `task_monitor__status_change_to_in_progress_updates_progress_bar_and_badge_color` | RTL | Mid-flight state update |
| TC-TASK-01-03 | `task_monitor__terminal_status_stops_polling_and_auto_downloads_when_enabled` | RTL | Terminal transition side effects |

### FR-TASK-02: Task Polling (Status Updates) (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TASK-02-01 | `use_poll_task__poll_interval_elapsing_sends_get_and_updates_task_card` | RTL | Interval-driven refetch |
| TC-TASK-02-02 | `use_poll_task__refetch_interval_returns_false_for_terminal_statuses` | RTL | Stops polling on SUCCEEDED/FAILED/CANCELED |
| TC-TASK-02-03 | `use_poll_task__continues_polling_in_background_when_window_unfocused` | RTL | `refetchIntervalInBackground: true` |

### FR-TASK-03: Task SSE Streaming (Opt-In) (Should · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TASK-03-01 | `stream_task__opens_sse_connection_and_emits_task_progress_events` | RUST | Backend SSE parsing + `app.emit` |
| TC-TASK-03-02 | `sse_listener__succeeded_event_updates_task_card_and_closes_connection` | RTL | Frontend `onEvent` handler |
| TC-TASK-03-03 | `sse_connection__failure_falls_back_to_polling_automatically` | RTL | Fallback behavior (FR-TASK-03-F5) |

### FR-TASK-04: Task Cancellation (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TASK-04-01 | `task_card__cancel_click_on_active_task_shows_confirmation_dialog` | RTL | Confirmation copy with credit-refund warning |
| TC-TASK-04-02 | `task_card__confirming_cancel_sends_delete_request_and_sets_status_canceled` | RTL | DELETE + status update, polling stops |

### FR-TASK-05: Task Retry on Failure (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TASK-05-01 | `task_card__retry_click_on_failed_task_resubmits_original_body_as_new_task` | RTL | Retry re-POSTs stored `task_log` request body |
| TC-TASK-05-02 | `task_card__retry_disabled_with_tooltip_for_402_insufficient_credits_failures` | RTL | Disabled-state exception |

### FR-TASK-06: Task History Log (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TASK-06-01 | `task_monitor__completed_tasks_move_to_history_with_label_status_credits_timestamp` | RTL | History section content |
| TC-TASK-06-02 | `task_monitor__clear_done_removes_terminal_tasks_from_store_but_keeps_sqlite` | RTL | `taskStore` clear vs SQLite retention |

### FR-TASK-07: Auto-Download on Task Success (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TASK-07-01 | `task_success__auto_download_enabled_calls_download_asset_automatically` | RTL | Default-true auto-download trigger |
| TC-TASK-07-02 | `download_asset__completion_updates_sqlite_paths_and_shows_success_toast` | RTL | Post-download side effects, `['assets']` invalidation |
| TC-TASK-07-03 | `task_success__auto_download_disabled_shows_manual_download_button` | RTL | Opt-out UI path |

### FR-NOTIF-01: OS Notification on Task Completion (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-NOTIF-01-01 | `task_succeeded__shows_os_notification_when_notifications_enabled` | RUST | `tauri-plugin-notification` fired with expected title/body |
| TC-NOTIF-01-02 | `task_failed__shows_os_notification_when_notifications_enabled` | RUST | Failure-path notification text |
| TC-NOTIF-01-03 | `task_completion__notifications_disabled_suppresses_os_notification_but_toast_still_shows` | RTL | Preference gate (in-app toast unaffected) |

### FR-NOTIF-03: Error Toast Notifications (Must · Phase 3)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-NOTIF-03-01 | `error_toast__402_shows_insufficient_credits_with_buy_credits_action` | RTL | 402 handling per CSD §10.2/10.3 |
| TC-NOTIF-03-02 | `error_toast__401_shows_invalid_api_key_with_update_key_action_to_settings` | RTL | 401 handling |
| TC-NOTIF-03-03 | `error_toast__network_error_shows_retry_action` | RTL | Network-failure handling |
| TC-NOTIF-03-04 | `error_toast__429_shows_rate_limited_and_auto_dismisses_on_retry_success` | RTL | 429 handling |

**Phase 3 subtotal: 35 features, 101 test cases.**

---

## 7. Phase 4 — Asset Library: Test Cases

### FR-GAL-01: Asset Thumbnail Grid (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-01-01 | `gallery__loads_all_downloaded_assets_as_thumbnail_cards_in_responsive_grid` | RTL | `get_all_assets` → grid render |
| TC-GAL-01-02 | `gallery_card__shows_thumbnail_title_tags_credits_favorite_and_status_badge` | RTL | Card content inventory |
| TC-GAL-01-03 | `gallery__over_100_assets_triggers_virtualized_rendering` | RTL | Virtualization threshold crossing |
| TC-GAL-01-04 | `gallery__assets_are_ordered_newest_first_by_created_at` | RTL | Default sort order |

### FR-GAL-02: Asset Card Display (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-02-01 | `gallery_card__hover_applies_accent_border_and_shadow` | RTL | Hover visual state |
| TC-GAL-02-02 | `gallery_card__click_opens_asset_detail_panel` | RTL | `setSelectedAsset` navigation |
| TC-GAL-02-03 | `gallery_card__right_click_opens_context_menu_with_export_tag_delete_reveal` | RTL | Context menu options |
| TC-GAL-02-04 | `gallery_card__enter_key_on_focused_card_opens_detail_panel` | RTL | KBD-06 keyboard access |
| TC-GAL-02-05 | `gallery_card__uses_stable_meshy_task_id_as_list_key` | RTL | RND-02 key stability |

### FR-GAL-03: Full-Text Search (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-03-01 | `gallery_search__typed_query_filters_after_300ms_debounce` | RTL | Debounce + `search_assets` call |
| TC-GAL-03-02 | `gallery_search__empty_query_restores_full_asset_list` | RTL | No-filter path |
| TC-GAL-03-03 | `gallery_search__no_matches_shows_no_assets_match_search_empty_state` | RTL | Empty-result state |

### FR-GAL-04: Tag-Based Filtering (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-04-01 | `tag_filter__dropdown_lists_all_tags_with_asset_counts` | RTL | Dropdown content |
| TC-GAL-04-02 | `tag_filter__selecting_a_tag_filters_gallery_to_matching_assets` | RTL | Filtered `search_assets(query, tag)` call |
| TC-GAL-04-03 | `tag_filter__selecting_all_clears_the_tag_filter` | RTL | Reset path |

### FR-GAL-05: Sort by Date (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-05-01 | `sort_dropdown__offers_newest_first_default_and_oldest_first` | RTL | Options rendered |
| TC-GAL-05-02 | `sort_dropdown__oldest_first_orders_assets_by_created_at_ascending` | RTL | Sort direction applied |

### FR-GAL-06: Gallery Virtualization (100+ Assets) (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-06-01 | `gallery__fifty_assets_render_without_virtualization` | RTL | Below-threshold behavior |
| TC-GAL-06-02 | `gallery__five_hundred_assets_render_only_visible_cards_with_overscan` | RTL | `@tanstack/react-virtual` windowed rendering |

### FR-GAL-07: Empty States (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-07-01 | `gallery__no_api_key_shows_add_api_key_empty_state_linking_to_settings` | RTL | No-key empty state |
| TC-GAL-07-02 | `gallery__no_assets_shows_go_to_generate_empty_state` | RTL | No-assets empty state |
| TC-GAL-07-03 | `gallery__empty_search_results_shows_clear_filters_empty_state` | RTL | No-results empty state |

### FR-GAL-08: Asset Deletion (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-08-01 | `asset_delete__shows_confirmation_dialog_with_irreversible_warning_text` | RTL | AlertDialog copy |
| TC-GAL-08-02 | `asset_delete__confirm_removes_asset_from_gallery_disk_and_invalidates_assets_query` | RTL | `delete_asset` + cache invalidation |

### FR-GAL-09: Favorite Toggle (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-09-01 | `favorite_star__click_on_unfavorited_asset_fills_star_and_sets_favorite_flag` | RTL | `toggle_favorite` on |
| TC-GAL-09-02 | `favorite_star__click_on_favorited_asset_empties_star_and_clears_favorite_flag` | RTL | `toggle_favorite` off |
| TC-GAL-09-03 | `favorite_star__exposes_aria_pressed_matching_favorite_state` | RTL | Screen-reader state |

### FR-GAL-10: Asset Detail Panel (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-GAL-10-01 | `asset_detail__opens_with_3d_preview_and_full_metadata_panel` | RTL | Panel composition |
| TC-GAL-10-02 | `asset_detail__back_button_closes_panel_and_returns_to_gallery` | RTL | Navigation back |
| TC-GAL-10-03 | `asset_detail__reveal_in_finder_opens_os_file_manager_at_asset_directory` | E2E | Real OS file-manager launch |
| TC-GAL-10-04 | `asset_detail__layout_stacks_vertically_below_1280px_width` | RTL | RES-03 responsive layout |
| TC-GAL-10-05 | `asset_detail__post_processing_buttons_navigate_with_asset_preselected` | RTL | Remesh/Retexture/Rig/etc. deep-link |

### FR-PREV-01: 3D Model Preview (GLB) (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-PREV-01-01 | `preview_canvas__renders_glb_with_orbit_controls_studio_lighting_and_contact_shadows` | RTL | R3F Canvas composition (mocked GL context) |
| TC-PREV-01-02 | `preview_canvas__shows_wireframe_placeholder_while_glb_is_loading` | RTL | Loading state |
| TC-PREV-01-03 | `preview_canvas__falls_back_to_thumbnail_with_message_when_glb_load_fails` | RTL | Error path (VP-04) |
| TC-PREV-01-04 | `preview_canvas__has_aria_label_role_img_and_text_description_below` | RTL | 3D-A11Y-01/02/03 |

### FR-PREV-02: 3D Camera Controls (Orbit, Zoom) (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-PREV-02-01 | `preview_camera__mouse_drag_orbits_the_model` | E2E | Real pointer-driven orbit (not reproducible in jsdom) |
| TC-PREV-02-02 | `preview_camera__scroll_wheel_zooms_camera_in_and_out` | E2E | Real wheel-event zoom |
| TC-PREV-02-03 | `preview_camera__zoom_is_clamped_between_distance_2_and_15` | RTL | `OrbitControls` `minDistance`/`maxDistance` config (CAM-03) |

### FR-PREV-03: 3D Preview Fallback (Thumbnail) (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-PREV-03-01 | `canvas_error_boundary__webgl_unavailable_shows_thumbnail_fallback_message` | RTL | WebGL-unavailable path |
| TC-PREV-03-02 | `canvas_error_boundary__corrupted_glb_parse_failure_shows_thumbnail_fallback` | RTL | Parse-failure path |

### FR-PREV-04: 3D Preview Memory Cleanup (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-PREV-04-01 | `preview_canvas__unmount_disposes_webgl_context_and_clears_gltf_cache` | RTL | `gl.dispose()` + `useGLTF.clear(path)` called on cleanup |
| TC-PREV-04-02 | `preview_canvas__twenty_open_close_cycles_show_no_sustained_memory_growth` | E2E | UI/UX §13.2 manual/perf gate, automated where DevTools memory API is scriptable |

### FR-TAG-01: Add and Remove Tags (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TAG-01-01 | `tag_editor__enter_key_on_tag_input_adds_badge_and_persists_tag` | RTL | `update_tags` call + badge render |
| TC-TAG-01-02 | `tag_editor__click_x_on_badge_removes_tag_and_unlinks_from_asset` | RTL | Tag removal |
| TC-TAG-01-03 | `tag_editor__adding_existing_tag_name_reuses_existing_tag_record` | RTL | No-duplicate-tag behavior |

### FR-TAG-02: Notes Editor (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TAG-02-01 | `notes_editor__typing_and_blurring_saves_after_500ms_debounce` | RTL | `update_notes` debounced save |
| TC-TAG-02-02 | `notes_editor__reopening_detail_panel_shows_previously_saved_notes` | RTL | Persistence round trip |

### FR-TAG-03: Metadata Display (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TAG-03-01 | `metadata_panel__displays_id_type_model_prompt_credits_dates_and_status` | RTL | Field inventory |
| TC-TAG-03-02 | `metadata_panel__boolean_fields_render_as_check_or_x_icons` | RTL | has_textures/has_rig/has_animation rendering |

### FR-TAG-04: Task Chain Visualization (Should · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-TAG-04-01 | `task_chain__asset_with_parent_task_id_displays_breadcrumb_chain` | RTL | Chain construction from `parent_task_id` |
| TC-TAG-04-02 | `task_chain__clicking_parent_task_navigates_to_parent_asset_detail` | RTL | Chain navigation |

### FR-EXP-01: Single Asset Export (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-EXP-01-01 | `export_dialog__opens_with_format_selection_and_choose_location_button` | RTL | Dialog composition |
| TC-EXP-01-02 | `export_dialog__confirm_copies_file_to_chosen_location_and_shows_success_toast` | RTL | Copy operation + toast |
| TC-EXP-01-03 | `export_dialog__format_not_downloaded_shows_regenerate_with_format_message` | RTL | Missing-format guard |

### FR-EXP-02: Batch Export (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-EXP-02-01 | `gallery__ctrl_click_selects_multiple_assets_for_batch_export` | RTL | Multi-select interaction |
| TC-EXP-02-02 | `batch_export__export_all_copies_each_asset_and_shows_progress_bar` | RTL | Batch copy + progress UI |
| TC-EXP-02-03 | `batch_export__assets_missing_selected_format_are_skipped_with_warning_toast` | RTL | Partial-failure handling |

### FR-EXP-03: Export Format Selection (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-EXP-03-01 | `export_format_list__downloaded_formats_enabled_others_disabled_with_tooltip` | RTL | Availability derived from `file_paths` |
| TC-EXP-03-02 | `export_format_list__uses_radio_for_single_export_and_checkboxes_for_batch` | RTL | FRM-07 fieldset/legend semantics |

### FR-EXP-04: Reveal Asset in OS File Manager (Must · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-EXP-04-01 | `reveal_button__label_is_platform_specific_finder_explorer_or_file_manager` | RTL | Platform-conditional label |
| TC-EXP-04-02 | `reveal_in_file_manager__command_opens_os_file_manager_at_asset_directory` | RUST | Backend command behavior |

### FR-EXP-05: Storage Usage Display (Should · Phase 4)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-EXP-05-01 | `statusbar__displays_total_asset_storage_size` | RTL | `get_storage_usage` + `formatFileSize` render |
| TC-EXP-05-02 | `statusbar__storage_display_updates_within_5s_after_download_or_delete` | RTL | Refresh trigger on storage-changing operations |

**Phase 4 subtotal: 23 features, 63 test cases.**

---

## 8. Phase 5 — Polish and Release: Test Cases

### FR-SET-05: Prompt Preset Save and Load (Should · Phase 5)

| Test ID | Test Name | Type | Verifies |
|---|---|---|---|
| TC-SET-05-01 | `preset_save__click_prompts_for_name_and_persists_current_form_state` | RTL | Save-dialog → SQLite `prompt_presets` write |
| TC-SET-05-02 | `preset_load__dropdown_lists_saved_presets_sorted_by_name` | RTL | Load dropdown content |
| TC-SET-05-03 | `preset_load__selecting_a_preset_populates_all_form_fields` | RTL | Field population on load |
| TC-SET-05-04 | `preset__is_form_type_specific_and_does_not_cross_apply_between_panels` | RTL | Text-to-3D presets excluded from Image-to-3D form and vice versa |

**Phase 5 subtotal: 1 feature, 4 test cases.**

---

## 9. Summary

### 9.1 Phase-by-Phase Summary

| Phase | Feature Count | Test Case Count |
|---|---|---|
| 0 — Project Scaffold | 3 | 13 |
| 1 — Backend Foundation | 5 | 27 |
| 2 — Core UI Shell | 9 | 37 |
| 3 — Generation Workflows | 35 | 101 |
| 4 — Asset Library | 23 | 64 |
| 5 — Polish and Release | 1 | 4 |
| **Total** | **76** | **246** |

### 9.2 Test Case Count by Type

| Type | Count | Approx. Share |
|---|---|---|
| React component test (RTL) | 196 | 80% |
| Rust unit test (RUST) | 29 | 12% |
| Playwright E2E test (E2E) | 11 | 4% |
| CI/Build Gate (GATE) | 10 | 4% |
| **Total** | **246** | 100% |

The E2E workflows enumerated in FRD §9.2 (E2E-01 through E2E-10) are cross-feature by design and are not restated as separate test cases in this plan — they compose sequences of the feature-level test cases above (e.g., E2E-02 "Text to 3D: prompt → preview → download → gallery → 3D preview → refine → linked asset" exercises FR-GEN-01, FR-TASK-01/02/07, FR-GAL-01, FR-PREV-01, and FR-GEN-02 in sequence). Phase 5's quality-gate checklist should include running all ten named E2E-0x workflows as scripted Playwright suites in addition to the per-feature tests above.

### 9.3 Known Ambiguities and Gaps

1. **Feature count discrepancy in the FRD itself.** FRD §4.2/§4.3 report a total of 65 features (60 Must Have + 5 Should Have), but the §4.1 Feature Summary table actually lists, and §5 actually specifies, **76** distinct feature IDs — including only 4 Should Have features (FR-SET-05, FR-TASK-03, FR-TAG-04, FR-EXP-05), not 5. This test plan follows the FRD's actual §5 content (76 features) rather than its stated summary totals, since coverage must match what is specified, not what is counted. This is a pre-existing inconsistency in the FRD and is called out here rather than silently resolved.
2. **FR-CLAB-02 (Fridge Magnet) and FR-CLAB-04 (Vinyl Figure)** have no GIVEN/WHEN/THEN acceptance-criteria block in FRD §5 — only a description and functional requirements referencing FR-CLAB-01's shared workflow. Test cases for these two features are derived from the functional requirements table rather than an explicit AC block.
3. **FR-PREV-02 (camera orbit/zoom) and FR-PREV-04 (memory cleanup, 20-cycle check)** describe interactions (mouse drag, scroll wheel, sustained memory growth) that UI/UX §13.2 itself classifies as *manual* quality gates, not automated CI checks. This plan tags the interaction-level cases as Playwright E2E on the assumption of a real Chromium/WebView pointer and DevTools Performance API, but UI/UX §13.2 treats the actual pass/fail judgment as a manual pre-release step; automating it fully may not be practical and a manual verification pass should remain in the Phase 5 release checklist regardless of the automated test's presence.
4. **FR-SET-04's "Refresh API Spec" button** (comparing bundled spec against `llms.txt`) has no defined UI behavior for what happens when a diff *is* found (no acceptance criterion describes a diff-detected state) — the test case TC-SET-04-03 only verifies the fetch-and-compare call fires, not any downstream UI reaction, since none is specified.
5. **FR-TASK-03 (SSE streaming)** is Should Have and opt-in; its Rust-side SSE parsing test (TC-TASK-03-01) duplicates coverage already implied by FR-INF-04-F6's more general `stream_task` test (TC-INF-04-04). Both are kept since one verifies the generic client method and the other verifies the feature-level opt-in wiring, but an implementer may reasonably choose to write one shared test fixture for both.

---

*End of Test Plan — MeshyForge v1.0.0*
