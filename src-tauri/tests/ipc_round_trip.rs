// MeshyForge — Tier-1 IPC round-trip harness (ADR-0016)
//
// Defect class prevented: failures that exist ONLY at the real Tauri command
// boundary. The unit suites cannot see them — the frontend mocks `@lib/tauri`,
// and the Rust tests call the `*_inner` functions directly, bypassing the
// `#[tauri::command]` wrappers, the `generate_handler!` dispatch, Tauri's
// camelCase→snake_case argument mapping, and the `{code, message}` error
// envelope's transport. `docs/audits/e2e-ui-qa-2026-11-08.md` §2 records that
// no test had ever crossed that boundary; QA-01 is the defect it missed.
//
// This harness builds the REAL app (MockRuntime + the shared `add_commands`
// registry from lib.rs) and invokes commands the way the webview does: JSON
// bodies with camelCase keys, dispatched by command name. Every test pins one
// of the seam contracts:
//   1. registry dispatch (phantom/renamed commands fail here, not at runtime)
//   2. camelCase argument decode (Tauri v2 maps Rust snake_case params)
//   3. the error envelope as it crosses the wire (`Err(String)` arrives as
//      JSON *text* in the error channel — exactly the shape `parseError` in
//      src/lib/tauri.ts receives)
//
// `tauri::test::get_ipc_response` rendezvouses with tauri's own lazy
// multithreaded tokio runtime, so plain `#[test]` is correct here (CSD TST-10
// prohibits `block_on()`; this uses neither). Async commands complete fully.
//
// State isolation: `AppState` is built on a tempdir database and an
// `InMemoryKeychain` (rust-backend rule: injected doubles, never real user
// keychain entries or app data). Network-touching commands are exercised only
// on paths that fail closed BEFORE the provider is consulted, or with a
// fake key whose validation rejects before any HTTP call.

use meshyforge::app_state::AppState;
use meshyforge::security::{InMemoryKeychain, Keychain};
use serde_json::{json, Value};
use std::sync::Arc;
use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{get_ipc_response, mock_builder, mock_context, noop_assets, INVOKE_KEY};
use tauri::webview::InvokeRequest;
use tauri::WebviewWindow;

type MockWindow = WebviewWindow<tauri::test::MockRuntime>;

/// Build the real app: the shared main registry from lib.rs (ADR-0016
/// extraction — the exact list `run()` uses), tempdir SQLite, injected
/// in-memory keychain, and a mock webview window to route invokes through.
fn harness() -> (
    tauri::App<tauri::test::MockRuntime>,
    MockWindow,
    Arc<InMemoryKeychain>,
) {
    let dir = tempfile::tempdir().expect("tempdir").keep();
    let keychain = Arc::new(InMemoryKeychain::new());
    let state =
        AppState::new_with_keychain(dir, keychain.clone() as Arc<dyn Keychain>).expect("AppState");

    let app = meshyforge::add_commands(mock_builder())
        .manage(state)
        .build(mock_context(noop_assets()))
        .expect("mock app builds with the real command registry");
    let window = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .expect("mock webview window");
    (app, window, keychain)
}

/// One IPC round trip: `cmd` with a camelCase JSON body. Ok payloads are
/// returned as the parsed JSON the webview would see; rejected commands
/// return the envelope object parsed from the error channel's JSON *text*.
fn ipc(window: &MockWindow, cmd: &str, body: Value) -> Value {
    let response = invoke_raw(window, cmd, body);
    match response {
        Ok(payload) => payload
            .deserialize::<Value>()
            .expect("ok payload must be valid JSON"),
        Err(error) => {
            let text = match &error {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            serde_json::from_str(&text).unwrap_or_else(|_| {
                panic!("rejected command must carry a JSON envelope string, got {error:?}")
            })
        }
    }
}

/// Raw invoke for tests that assert on the transport itself (rejection text,
/// deserialization failures) rather than a parsed envelope.
fn invoke_raw(
    window: &MockWindow,
    cmd: &str,
    body: Value,
) -> Result<tauri::ipc::InvokeResponseBody, serde_json::Value> {
    get_ipc_response(
        window,
        InvokeRequest {
            cmd: cmd.into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: "http://tauri.localhost".parse().expect("valid url"),
            body: InvokeBody::Json(body),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    )
}

/// Assert a rejection carries the stable envelope contract (IPC-01): the
/// expected `code` and a non-empty human `message`.
fn assert_envelope(rejection: &Value, code: &str) {
    assert_eq!(
        rejection["code"], code,
        "unexpected error code in {rejection}"
    );
    assert!(
        rejection["message"].as_str().is_some_and(|m| !m.is_empty()),
        "envelope must carry a human message: {rejection}"
    );
}

// ─── Seam 1: registry dispatch ─────────────────────────────────

#[test]
fn invokes_a_registered_command_through_generate_handler_dispatch() {
    let (_app, window, _kc) = harness();
    let ok = ipc(&window, "get_all_tags", json!({}));
    assert_eq!(ok, json!([]), "fresh database has no tags");
}

#[test]
fn rejects_a_phantom_command_the_webview_would_never_resolve() {
    let (_app, window, _kc) = harness();
    // The frontend guardrail catches name typos statically; this pins the
    // runtime behavior of an unregistered name: a rejection, not a hang.
    match invoke_raw(&window, "not_a_real_command", json!({})) {
        Err(Value::String(message)) => {
            assert!(message.contains("not_a_real_command"), "got {message}");
        }
        other => panic!("unregistered command must reject, got {other:?}"),
    }
}

#[test]
fn destructive_restore_command_is_not_reachable_from_the_main_registry() {
    let (_app, window, _kc) = harness();
    // `request_recovery_restore` is deliberately only in the recovery-UI
    // registry (ADR-0008/0009 isolation). The frontend invokes it only from
    // that mode; the main registry must not resolve it.
    match invoke_raw(
        &window,
        "request_recovery_restore",
        json!({ "backupId": "2026-01-01T00-00-00Z" }),
    ) {
        Err(Value::String(message)) => {
            assert!(message.contains("not found"), "got {message}");
        }
        other => panic!("destructive restore must not resolve in main registry: {other:?}"),
    }
}

// ─── Seam 2: camelCase argument decode (the QA doc's known-unknown) ───

#[test]
fn decodes_camel_case_asset_id_into_the_snake_case_param() {
    let (_app, window, _kc) = harness();
    // Rust param is `asset_id`; the webview sends `assetId`
    // (src/hooks/useToggleFavorite.ts). A rename on either side is invisible
    // to every mock-based suite; here the deserialization error proves the
    // mapping is the contract.
    let ok = ipc(
        &window,
        "toggle_favorite",
        json!({ "assetId": "missing-asset" }),
    );
    // Unknown asset is a no-op UPDATE (0 rows) — the point is the param
    // DECODED; a wrong key name would reject before reaching the command.
    assert_eq!(ok, json!(null), "Ok(()) crosses the wire as null");
}

#[test]
fn snake_case_wire_keys_are_not_the_tauri_v2_contract() {
    let (_app, window, _kc) = harness();
    // Negative control for the test above: Tauri v2 looks up camelCase keys,
    // so `asset_id` must NOT bind to the `assetId`-mapped param. If a future
    // Tauri accepts both, this test forces a conscious update.
    let result = invoke_raw(&window, "toggle_favorite", json!({ "asset_id": "task-1" }));
    assert!(
        result.is_err(),
        "snake_case wire keys must be rejected as missing-arg, not silently bound"
    );
}

#[test]
fn decodes_camel_case_task_fields_for_poll_task() {
    let (_app, window, _kc) = harness();
    // `poll_task(task_type, task_id)` ← `{ taskType, taskId }`. An unknown
    // taskType fails closed at dispatch, before the provider (TPC-05).
    let rejection = ipc(
        &window,
        "poll_task",
        json!({ "taskType": "bogus-type", "taskId": "00000000-0000-0000-0000-000000000000" }),
    );
    assert_envelope(&rejection, "INVALID_INPUT");
}

#[test]
fn decodes_camel_case_destination_path_for_export_asset() {
    let (_app, window, _kc) = harness();
    // `export_asset(path, destination_path)` ← `{ path, destinationPath }`
    // (src/hooks/useExportAsset.ts). The command's own INVALID_PATH envelope
    // — rather than a missing-arg deserialization error — proves both params
    // decoded.
    let rejection = ipc(
        &window,
        "export_asset",
        json!({ "path": "assets/missing/model.glb", "destinationPath": "C:/tmp/out.glb" }),
    );
    assert_envelope(&rejection, "INVALID_PATH");
}

// ─── Seam 3: the {code, message} envelope as it crosses the wire ───

#[test]
fn keychain_commands_cross_the_seam_with_the_injected_store() {
    let (_app, window, keychain) = harness();
    // ADR-0016 keychain seam: set → get → delete all dispatch through
    // state.keychain (the injected double), never the OS credential store.
    let saved = ipc(&window, "set_api_key", json!({ "key": "meshy-abc-123" }));
    assert_eq!(saved, json!(null), "set_api_key Ok(()) crosses as null");
    assert!(
        keychain.get().expect("in-memory store").is_some(),
        "the command must have written through the injected keychain"
    );

    let exists = ipc(&window, "get_api_key", json!({}));
    assert_eq!(
        exists,
        json!(true),
        "get_api_key reports existence, not the key"
    );

    ipc(&window, "delete_api_key", json!({}));
    assert!(keychain.get().expect("in-memory store").is_none());
}

#[test]
fn set_api_key_rejects_an_empty_key_with_the_stable_envelope() {
    let (_app, window, keychain) = harness();
    let rejection = ipc(&window, "set_api_key", json!({ "key": "" }));
    assert_envelope(&rejection, "INVALID_INPUT");
    assert!(
        keychain.get().unwrap().is_none(),
        "rejection must not persist"
    );
}

#[test]
fn settings_round_trip_and_reject_invalid_keys_across_the_seam() {
    let (_app, window, _kc) = harness();
    let saved = ipc(
        &window,
        "set_setting",
        json!({ "key": "prompt_presets", "value": "[]" }),
    );
    assert_eq!(saved, json!(null));
    let read = ipc(&window, "get_setting", json!({ "key": "prompt_presets" }));
    assert_eq!(read, json!("[]"), "Option<String> crosses as the raw value");

    let missing = ipc(&window, "get_setting", json!({ "key": "Prompt_Presets" }));
    assert_envelope(&missing, "INVALID_INPUT");
}

#[test]
fn create_text_to_3d_fails_closed_before_the_provider_when_no_key_is_set() {
    let (_app, window, _kc) = harness();
    // IPC-04/VAL-01: the provider lookup happens before any network call, so
    // this path is safe to cross with no provider configured.
    let rejection = ipc(
        &window,
        "create_text_to_3d",
        json!({ "body": { "mode": "preview", "prompt": "a wooden chair" } }),
    );
    assert_envelope(&rejection, "MISSING_API_KEY");
}

#[test]
fn poll_task_rejects_a_malformed_task_id_before_any_network_call() {
    let (_app, window, _kc) = harness();
    // Seed a syntactically valid fake key so the provider exists; task-id
    // validation then runs before the HTTP call (poll_task_inner order),
    // so nothing leaves the process.
    ipc(
        &window,
        "set_api_key",
        json!({ "key": "fake-key-for-validation" }),
    );
    let rejection = ipc(
        &window,
        "poll_task",
        json!({ "taskType": "text-to-3d", "taskId": "not-a-uuid" }),
    );
    assert_envelope(&rejection, "INVALID_INPUT");
}

#[test]
fn download_asset_rejects_a_malformed_task_id_before_the_provider() {
    let (_app, window, _kc) = harness();
    // download_asset_inner validates the task id FIRST — safe to cross with
    // no provider at all.
    let rejection = ipc(
        &window,
        "download_asset",
        json!({
            "taskId": "not-a-uuid",
            "artifacts": [{ "role": "primary", "format": "glb", "url": "https://assets.meshy.ai/m.glb" }],
            "thumbnailUrl": null
        }),
    );
    assert_envelope(&rejection, "INVALID_INPUT");
}

#[test]
fn download_asset_reaches_the_provider_guard_after_id_validation() {
    let (_app, window, _kc) = harness();
    // Valid UUID + no provider: the camelCase `taskId`/`thumbnailUrl` params
    // decoded and the next guard (MISSING_API_KEY) fired — SEC-06 host
    // allowlisting on the Ok path needs the fake-TaskProvider follow-up.
    let rejection = ipc(
        &window,
        "download_asset",
        json!({
            "taskId": "00000000-0000-0000-0000-000000000000",
            "artifacts": [{ "role": "primary", "format": "glb", "url": "https://evil.example/model.glb" }],
            "thumbnailUrl": null
        }),
    );
    assert_envelope(&rejection, "MISSING_API_KEY");
}

#[test]
fn get_credit_balance_reports_missing_key_through_the_envelope() {
    let (_app, window, _kc) = harness();
    // TC-INF-07-01 (test_plan.md): the dispatch half of "real IPC round trip
    // through generate_handler! registration". The Ok(i64) half needs a
    // wiremock-backed provider and lands with the fake-TaskProvider follow-up
    // (ADR-0016 Consequences).
    let rejection = ipc(&window, "get_credit_balance", json!({}));
    assert_envelope(&rejection, "MISSING_API_KEY");
}

// ─── Seam 4: composite flows crossed end-to-end ────────────────

#[test]
fn save_then_list_round_trips_an_asset_through_the_wire() {
    let (_app, window, _kc) = harness();
    // The payload mirrors src/hooks/useActiveTaskPolling.ts's
    // invoke('save_completed_task', { args }) shape — camelCase struct
    // fields under the `args` key.
    let saved = ipc(
        &window,
        "save_completed_task",
        json!({
            "args": {
                "taskId": "task-wire-1",
                "taskType": "text-to-3d",
                "prompt": "a brass lamp",
                "status": "SUCCEEDED",
                "progress": 100,
                "consumedCredits": 30,
                "artifacts": [{ "role": "primary", "format": "glb", "url": "https://assets.meshy.ai/x.glb" }],
                "createdAt": 1000,
                "startedAt": 1010,
                "finishedAt": 1100
            }
        }),
    );
    assert_eq!(saved, json!(null));

    let page = ipc(
        &window,
        "list_assets_page",
        json!({ "limit": 10, "offset": 0 }),
    );
    assert_eq!(
        page["total"],
        json!(1),
        "the saved asset must appear: {page}"
    );
    assert_eq!(page["assets"][0]["id"], json!("task-wire-1"));
    // F2: file_paths crosses as a JSON object, never a string.
    assert!(page["assets"][0]["filePaths"].is_object(), "{page}");

    let tags = ipc(
        &window,
        "update_tags",
        json!({ "assetId": "task-wire-1", "tags": ["lamp"] }),
    );
    assert_eq!(tags, json!(null));
    let all_tags = ipc(&window, "get_all_tags", json!({}));
    assert_eq!(all_tags, json!(["lamp"]));
}

#[test]
fn recovery_status_crosses_with_its_typed_wire_shape() {
    // recovery_status reads platform_data_dir(), not app state — on this
    // machine that is the real %APPDATA% dir, so this pins only that the
    // command dispatches and returns the documented enum/field shape, not
    // any specific recovery state.
    let (_app, window, _kc) = harness();
    let status = ipc(&window, "recovery_status", json!({}));
    let state = status["state"].as_str().unwrap_or("");
    assert!(
        [
            "Normal",
            "RecoveryRequired",
            "RecoveryInProgress",
            "RecoveryFailed"
        ]
        .contains(&state),
        "RecoveryUiState must cross as its PascalCase wire name, got {status}"
    );
    assert!(status["backupIds"].is_array(), "{status}");
    assert!(status["quarantineExists"].is_boolean(), "{status}");
}
