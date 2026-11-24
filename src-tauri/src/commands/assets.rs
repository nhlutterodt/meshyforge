// MeshyForge — Asset Tauri Commands
//
// Source: TDD §7.3, IEP §1.8

use crate::app_state::AppState;
use crate::commands::error::error_json;
use crate::commands::validation::{
    artifact_storage_key, validate_page_window, DEFAULT_ASSET_PAGE_SIZE,
};
use crate::meshy::models::{
    cc_by_credit, AssetRecord, AssetRow, ExportRecord, ExportSource, EXPORT_SCHEMA_VERSION,
    RIGHTS_CC_BY,
};
use crate::provider::types::{ArtifactRole, TaskArtifact};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Typed `save_completed_task` IPC arguments (ADR-0015 step 3 / WU-E).
///
/// Lives in `commands/assets.rs` (not `provider/types.rs`) because it is a
/// command-boundary payload, not provider-normalization vocabulary — the same
/// placement rule `docs/rust_type_definitions.md` uses for command args.
/// Serialized camelCase: Tauri 2's command wrapper extracts each parameter by
/// its camelCase name from the invoke payload, so the frontend sends
/// `invoke('save_completed_task', { args })` and `payload["args"]` deserializes
/// into this struct (verified against tauri 2.11.5's `ipc::command.rs`, which
/// does `payload.get(self.key)` — no flattening).
///
/// `prompt` and `texture_urls` stay transitional (TPC-06): they have no
/// snapshot field yet and retire with `providerPayload` in step 4.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveCompletedTaskArgs {
    pub task_id: String,
    pub task_type: String,
    pub prompt: Option<String>,
    pub ai_model: Option<String>,
    pub status: String,
    pub progress: i64,
    pub consumed_credits: i64,
    pub thumbnail_url: Option<String>,
    /// Role-tagged artifacts (TPC-03). `file_paths` is built from these via
    /// `artifact_storage_key` (TPC-04) — pre-download the map holds role-key →
    /// remote URL; `mark_downloaded` later replaces it with role-key → local
    /// path under the same keys.
    pub artifacts: Vec<TaskArtifact>,
    pub texture_urls: Option<serde_json::Value>,
    pub created_at: i64,
    pub started_at: i64,
    pub finished_at: i64,
}

const INVALID_PATH_MESSAGE: &str = "The selected path is invalid or unavailable.";
const DATABASE_ERROR_MESSAGE: &str = "Database error. Try restarting the app.";

fn database_error(error: &rusqlite::Error) -> String {
    log::error!("Database operation failed: {error}");
    error_json("DATABASE_ERROR", DATABASE_ERROR_MESSAGE)
}

fn canonicalize_existing_path(path: &str) -> Result<PathBuf, String> {
    Path::new(path)
        .canonicalize()
        .map_err(|_| error_json("INVALID_PATH", INVALID_PATH_MESSAGE))
}

fn canonical_asset_path(data_dir: &Path, path: &str) -> Result<PathBuf, String> {
    let canonical_path = canonicalize_existing_path(path)?;
    let asset_root = data_dir
        .join("assets")
        .canonicalize()
        .map_err(|_| error_json("INVALID_PATH", INVALID_PATH_MESSAGE))?;

    if !canonical_path.starts_with(asset_root) {
        return Err(error_json(
            "INVALID_PATH",
            "Only downloaded MeshyForge assets can be revealed.",
        ));
    }

    Ok(canonical_path)
}

fn validated_image_mime(path: &Path, bytes: &[u8]) -> Result<&'static str, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| error_json("INVALID_IMAGE", "Select a PNG, JPEG, or WebP image."))?;

    let detected_mime = if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some("image/png")
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    };

    match (extension.as_str(), detected_mime) {
        ("png", Some("image/png")) => Ok("image/png"),
        ("jpg" | "jpeg", Some("image/jpeg")) => Ok("image/jpeg"),
        ("webp", Some("image/webp")) => Ok("image/webp"),
        _ => Err(error_json(
            "INVALID_IMAGE",
            "The file contents do not match a supported image type.",
        )),
    }
}

/// One page of assets plus the total match count, so the gallery can tell
/// whether a "Load More" affordance is still warranted (DAT-01).
///
/// A dedicated response type rather than a bare `Vec`: the frontend needs the
/// total to know if it reached the end, and deriving that from a short page
/// (`returned < limit`) would be wrong for the common case where the last page
/// is exactly full.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetPage {
    pub assets: Vec<AssetRow>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Retrieve one page of assets, newest first (DAT-01).
///
/// `limit` defaults to the catalog's `gallery_page_size` (50) when omitted.
/// Omitting BOTH `limit` and `offset` is the unpaged mode used by consumers
/// that need every asset (the task picker, which filters client-side for
/// eligible tasks); the response still carries a `total` and the effective
/// `limit`, so callers can always tell whether they saw everything.
#[tauri::command]
pub async fn list_assets_page(
    state: tauri::State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<AssetPage, String> {
    list_assets_page_inner(&state, limit, offset)
}

/// One page of a text/tag search, newest first, with the total match count.
/// This is the only search read exposed over IPC: the unpaged `Vec<AssetRow>`
/// variants were retired once the gallery moved to paging (DAT-01), so the wire
/// surface and the consumed surface match.
#[tauri::command]
pub async fn search_assets_page(
    state: tauri::State<'_, AppState>,
    query: String,
    tag: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<AssetPage, String> {
    search_assets_page_inner(&state, &query, tag.as_deref(), limit, offset)
}

/// Distinct tag names currently in use, ordered by name (for the tag filter).
///
/// Exists so the frontend does not fetch every asset row over IPC just to
/// derive the tag list (DAT-01's "load what you display" intent).
#[tauri::command]
pub async fn get_all_tags(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    get_all_tags_inner(&state)
}

/// Update the tags on an asset.
#[tauri::command]
pub async fn update_tags(
    state: tauri::State<'_, AppState>,
    asset_id: String,
    tags: Vec<String>,
) -> Result<(), String> {
    update_tags_inner(&state, &asset_id, &tags)
}

/// Toggle the favorite flag on an asset.
#[tauri::command]
pub async fn toggle_favorite(
    state: tauri::State<'_, AppState>,
    asset_id: String,
) -> Result<(), String> {
    toggle_favorite_inner(&state, &asset_id)
}

/// Update the notes on an asset.
#[tauri::command]
pub async fn update_notes(
    state: tauri::State<'_, AppState>,
    asset_id: String,
    notes: String,
) -> Result<(), String> {
    update_notes_inner(&state, &asset_id, &notes)
}

/// Record the rights predicates for one asset (`ADR-0022`, `LM-01`).
///
/// Four **enum** arguments and nothing else — no path, no free text. An
/// unrecognised value is refused rather than coerced, and there is deliberately
/// no way to clear a value back to `NULL`: `NULL` means pre-baseline, and
/// re-creating it would be a lie about when the record was made.
///
/// Returns the refreshed record including its derived values, so the frontend
/// renders what Rust computed and never recomputes it (`D-1`).
#[tauri::command]
pub async fn update_asset_rights(
    state: tauri::State<'_, AppState>,
    asset_id: String,
    plan_tier: String,
    published_to_community: String,
    third_party_material_attested: String,
    disclosure_posture: String,
) -> Result<crate::meshy::models::RightsRecord, String> {
    update_asset_rights_inner(
        &state,
        &asset_id,
        &plan_tier,
        &published_to_community,
        &third_party_material_attested,
        &disclosure_posture,
    )
}

const PLAN_TIERS: [&str; 3] = ["free", "paid", "unknown"];
const PREDICATE_VALUES: [&str; 3] = ["yes", "no", "unknown"];

fn validate_enum(value: &str, allowed: &[&str], field: &str) -> Result<String, String> {
    if allowed.contains(&value) {
        Ok(value.to_string())
    } else {
        Err(error_json(
            "INVALID_INPUT",
            &format!("{field} must be one of {}", allowed.join(", ")),
        ))
    }
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn update_asset_rights_inner(
    state: &AppState,
    asset_id: &str,
    plan_tier: &str,
    published: &str,
    attested: &str,
    disclosure: &str,
) -> Result<crate::meshy::models::RightsRecord, String> {
    let mut rights = crate::meshy::models::RightsRecord {
        plan_tier_at_generation: Some(validate_enum(plan_tier, &PLAN_TIERS, "planTier")?),
        published_to_community: Some(validate_enum(
            published,
            &PREDICATE_VALUES,
            "publishedToCommunity",
        )?),
        third_party_material_attested: Some(validate_enum(
            attested,
            &PREDICATE_VALUES,
            "thirdPartyMaterialAttested",
        )?),
        disclosure_posture: Some(validate_enum(
            disclosure,
            &PREDICATE_VALUES,
            "disclosurePosture",
        )?),
        // The timestamp is what distinguishes a RECORDED assertion from a
        // pre-baseline NULL. Without it the tri-state collapses.
        recorded_at: Some(chrono::Utc::now().timestamp_millis()),
        identifier: String::new(),
        reason: None,
    };
    rights.refresh_derived();

    let changed = state
        .database
        .update_asset_rights(asset_id, &rights)
        .map_err(|error| database_error(&error))?;
    if changed == 0 {
        return Err(error_json(
            "INVALID_INPUT",
            "That asset is no longer in the library.",
        ));
    }
    Ok(rights)
}

/// Delete an asset: its record, its tag links, AND the managed files it owns.
///
/// `ADR-0020`. This comment previously claimed the opposite ("Does not delete
/// files on disk") while `docs/SECURITY.md:26` promised removal — the code was
/// the outlier. Files are validated **per file** against `data_dir/assets`
/// before anything is removed, and files are removed **before** the row, so a
/// failure leaves a repairable record rather than an untracked file.
#[tauri::command]
pub async fn delete_asset(
    state: tauri::State<'_, AppState>,
    asset_id: String,
) -> Result<(), String> {
    delete_asset_inner(&state, &asset_id)
}

/// Get the count of downloaded assets (for storage usage display).
#[tauri::command]
pub async fn get_storage_usage(state: tauri::State<'_, AppState>) -> Result<i64, String> {
    get_storage_usage_inner(&state)
}

/// Reveal a file path in the OS file manager.
#[tauri::command]
pub async fn reveal_in_file_manager(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let canonical_path = canonical_asset_path(&state.data_dir, &path)?;
    #[allow(unused_variables)]
    let path_arg = canonical_path.to_string_lossy();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", path_arg.as_ref()])
            .spawn()
            .map_err(|_| error_json("OS_ERROR", "Could not open the file manager."))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", path_arg.as_ref()])
            .spawn()
            .map_err(|_| error_json("OS_ERROR", "Could not open the file manager."))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(canonical_path.parent().unwrap_or(&canonical_path))
            .spawn()
            .map_err(|_| error_json("OS_ERROR", "Could not open the file manager."))?;
    }
    Ok(())
}

/// Export (copy) a downloaded asset to a user-chosen destination, writing the
/// rights sidecar beside it (`ADR-0019`, `LM-02`).
///
/// Per ADR-0007 the source path must already be a canonicalized,
/// already-downloaded MeshyForge asset path (rooted under `data_dir/assets`) —
/// the same safety check `reveal_in_file_manager` uses — AND the asset identity
/// must resolve to a row that owns that path (`SEC-B`). No network calls, no
/// Meshy credits consumed.
///
/// Returns `Ok(None)` when the full record was written, `Ok(Some(warning))` when
/// the copy succeeded but the record could not be. **The degradation ladder is
/// deliberate**: a record failure must never block delivery of the user's file.
#[tauri::command]
pub async fn export_asset(
    state: tauri::State<'_, AppState>,
    path: String,
    destination_path: String,
    asset_id: String,
) -> Result<Option<String>, String> {
    export_asset_inner(&state, &path, &destination_path, &asset_id)
}

/// Read a file as a data URI (for displaying local images in the frontend).
#[tauri::command]
pub async fn read_file_as_data_uri(path: String) -> Result<String, String> {
    let canonical_path = canonicalize_existing_path(&path)?;
    let bytes = std::fs::read(&canonical_path)
        .map_err(|_| error_json("FILESYSTEM_ERROR", "The selected image could not be read."))?;
    let mime = validated_image_mime(&canonical_path, &bytes)?;
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

pub(crate) fn export_asset_inner(
    state: &AppState,
    path: &str,
    destination_path: &str,
    asset_id: &str,
) -> Result<Option<String>, String> {
    let canonical_path = canonical_asset_path(&state.data_dir, path)?;

    // ── Read the row ONCE, up front, outside any transaction (P-3) ──────────
    let source = match state.database.get_export_source(asset_id) {
        Ok(Some(source)) => source,
        Ok(None) => {
            copy_export_file(&canonical_path, destination_path)?;
            return Ok(Some(
                "Exported without a rights record: that asset is no longer in the library."
                    .to_string(),
            ));
        }
        Err(error) => {
            log::error!("Export record lookup failed: {error}");
            copy_export_file(&canonical_path, destination_path)?;
            return Ok(Some(
                "Exported without a rights record: the library could not be read.".to_string(),
            ));
        }
    };

    // ── SEC-B: the id must resolve to a row that OWNS this path ────────────
    // Without this, adding an asset id would become a way to export any file
    // under the asset root while claiming it is a different asset.
    if !row_owns_path(&source.file_paths_json, &canonical_path) {
        return Err(error_json(
            "INVALID_INPUT",
            "That asset does not own the file being exported.",
        ));
    }

    // ── The FILE first, the sidecar SECOND (ND-10) ─────────────────────────
    // The asymmetry is the whole point: a crash between these two leaves a file
    // with NO record, which is recoverable by exporting again. The reverse
    // order can leave a record describing a file that was never finished — a
    // document asserting provenance that does not exist.
    //
    // For a GLB the file is not merely copied but rewritten with the record
    // merged into its JSON chunk (ADR-0019 shape B, LM-04). Any embedding
    // failure falls back to the unmodified copy: a container we do not fully
    // understand is never delivered half-merged.
    let mut warning: Option<String> = None;
    if has_glb_extension(destination_path) {
        match embed_record_into_glb(&canonical_path, Path::new(destination_path), &source) {
            Ok(true) => {}
            Ok(false) => {
                copy_export_file(&canonical_path, destination_path)?;
                warning = Some(
                    "Exported without embedded metadata: the file's existing metadata could not be merged safely."
                        .to_string(),
                );
            }
            Err(error) => {
                copy_export_file(&canonical_path, destination_path)?;
                log::warn!("GLB embedding skipped: {}", error.message());
                warning = Some(format!(
                    "Exported without embedded metadata: {}.",
                    error.message()
                ));
            }
        }
    } else {
        copy_export_file(&canonical_path, destination_path)?;
    }

    match write_export_sidecar(destination_path, &source) {
        Ok(()) => Ok(warning),
        Err(sidecar_warning) => {
            // The sidecar is the baseline carrier, so its failure is the more
            // important one to surface even when embedding also degraded.
            log::warn!("{sidecar_warning}");
            Ok(Some(sidecar_warning))
        }
    }
}

fn has_glb_extension(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("glb"))
}

/// Merge the record into the GLB's JSON chunk, writing to a sibling temp file
/// and renaming on success.
///
/// Returns `Ok(false)` when the merge declined (nothing written) so the caller
/// can fall back to a plain copy.
fn embed_record_into_glb(
    canonical_source: &Path,
    destination: &Path,
    source: &ExportSource,
) -> Result<bool, crate::glb::GlbError> {
    use crate::glb;

    let file_name = destination
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or(glb::GlbError::Io)?;
    let parent = match destination.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    };
    let temporary = parent.join(format!("{file_name}.embed.tmp"));

    let record = build_export_record(source);
    let applied = glb::rewrite(canonical_source, &temporary, |document| {
        merge_record_into_asset(document, &record)
    })?;
    if !applied {
        let _ = std::fs::remove_file(&temporary);
        return Ok(false);
    }
    if std::fs::rename(&temporary, destination).is_err() {
        let _ = std::fs::remove_file(&temporary);
        return Err(glb::GlbError::Io);
    }
    Ok(true)
}

/// `LM-04`: merge, never replace.
///
/// Returns false when merging would have required destroying something we do
/// not understand — the one case where refusing is correct.
fn merge_record_into_asset(document: &mut serde_json::Value, record: &ExportRecord) -> bool {
    use serde_json::{Map, Value};

    let Some(root) = document.as_object_mut() else {
        return false;
    };
    let Some(asset) = root
        .entry("asset")
        .or_insert_with(|| Value::Object(Map::new()))
        .as_object_mut()
    else {
        return false;
    };

    // A provider's copyright is NEVER overwritten; our credit travels in the
    // namespace below instead.
    if let Some(credit) = &record.credit {
        if !asset.contains_key("copyright") {
            asset.insert("copyright".to_string(), Value::String(credit.clone()));
        }
    }

    // `asset.extras` must be an object (or absent). A non-object is left exactly
    // as it is — clobbering it is precisely what LM-04 forbids.
    let Some(extras) = asset
        .entry("extras")
        .or_insert_with(|| Value::Object(Map::new()))
        .as_object_mut()
    else {
        return false;
    };

    match serde_json::to_value(record) {
        Ok(value) => {
            // Namespaced, and replaced wholesale on re-export, so embedding is
            // idempotent rather than accumulative.
            extras.insert("meshyforge".to_string(), value);
            true
        }
        Err(_) => false,
    }
}

fn copy_export_file(canonical_path: &Path, destination_path: &str) -> Result<(), String> {
    std::fs::copy(canonical_path, destination_path).map_err(|_| {
        error_json(
            "FILESYSTEM_ERROR",
            "Could not copy the file to the chosen destination.",
        )
    })?;
    Ok(())
}

/// True when the row's `file_paths` map contains the canonical source path.
///
/// Values are provider URLs before download and absolute local paths after, so
/// only absolute values can match; a non-canonicalisable value is simply not a
/// match rather than an error.
fn row_owns_path(file_paths_json: &str, canonical_path: &Path) -> bool {
    let Ok(parsed) = serde_json::from_str::<serde_json::Value>(file_paths_json) else {
        return false;
    };
    let Some(map) = parsed.as_object() else {
        return false;
    };
    map.values()
        .filter_map(serde_json::Value::as_str)
        .map(Path::new)
        .filter(|stored| stored.is_absolute())
        .any(|stored| {
            stored
                .canonicalize()
                .map(|resolved| resolved == canonical_path)
                .unwrap_or(false)
        })
}

fn build_export_record(source: &ExportSource) -> ExportRecord {
    use sha2::{Digest, Sha256};

    ExportRecord {
        schema_version: EXPORT_SCHEMA_VERSION,
        rights: source.rights.clone(),
        credit: if source.rights.identifier == RIGHTS_CC_BY {
            Some(cc_by_credit(source.parent_task_id.as_deref()))
        } else {
            None
        },
        // A digest, never the brief. NOT confidentiality: a short or guessable
        // prompt can be confirmed by hashing candidates.
        prompt_sha256: source
            .prompt
            .as_ref()
            .map(|prompt| hex::encode(Sha256::digest(prompt.as_bytes()))),
        parent_task_id: source.parent_task_id.clone(),
        generated_at: Some(source.created_at),
    }
}

/// Write `<destination>.meta.json` atomically beside the exported file.
///
/// The path is derived by APPENDING to the user's chosen destination — never by
/// replacing the extension, and never from a database value (`SEC-A`). The write
/// lands in the destination's own directory through a sibling temp file and a
/// rename, so a reader never observes a half-written record.
fn write_export_sidecar(destination_path: &str, source: &ExportSource) -> Result<(), String> {
    let destination = Path::new(destination_path);
    let file_name = destination
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| {
            "Exported without a rights record: the destination has no usable file name.".to_string()
        })?;
    let parent = match destination.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    };

    let sidecar = parent.join(format!("{file_name}.meta.json"));

    // Refuse anything that is not a regular file at that path. Overwriting a
    // REGULAR file is allowed on purpose: the name derives from the destination
    // the user just chose, so it is our own earlier output, and refusing would
    // make re-export permanently degraded.
    if let Ok(metadata) = std::fs::symlink_metadata(&sidecar) {
        if !metadata.is_file() || metadata.file_type().is_symlink() {
            return Err(
                "Exported without a rights record: a non-file already exists at the sidecar path."
                    .to_string(),
            );
        }
    }

    let json = serde_json::to_vec_pretty(&build_export_record(source))
        .map_err(|_| "Exported without a rights record: it could not be serialised.".to_string())?;

    // Append `.tmp` to the FULL name: `with_extension("tmp")` would turn
    // `out.glb.meta.json` into `out.glb.meta.tmp`.
    let temporary = parent.join(format!("{file_name}.meta.json.tmp"));
    std::fs::write(&temporary, &json)
        .map_err(|_| "Exported without a rights record: it could not be written.".to_string())?;
    if std::fs::rename(&temporary, &sidecar).is_err() {
        let _ = std::fs::remove_file(&temporary);
        return Err("Exported without a rights record: it could not be committed.".to_string());
    }
    Ok(())
}

// ─── Pure inner functions (testable without tauri::State) ──────

pub(crate) fn get_all_tags_inner(state: &AppState) -> Result<Vec<String>, String> {
    state
        .database
        .get_all_tags()
        .map_err(|error| database_error(&error))
}

/// Resolve an optional (limit, offset) pair into a concrete window.
///
/// Both `None` is the unpaged mode: the whole table, reported via a negative
/// SQLite LIMIT. Only one being `Some` is still a valid request — a lone
/// `limit` is page 0 of that size, a lone `offset` is an offset with the
/// default page size.
pub(crate) fn resolve_page_window(
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<(i64, i64), String> {
    validate_page_window(limit, offset).map_err(|message| error_json("INVALID_INPUT", message))?;
    match (limit, offset) {
        (None, None) => Ok((UNBOUNDED_LIMIT, 0)),
        (limit, offset) => Ok((
            limit.unwrap_or(DEFAULT_ASSET_PAGE_SIZE),
            offset.unwrap_or(0),
        )),
    }
}

/// Sentinel passed to the database layer meaning "no upper bound" (SQLite
/// treats a negative LIMIT as unlimited). Mirrors `storage::database`'s
/// private `UNBOUNDED` constant.
pub(crate) const UNBOUNDED_LIMIT: i64 = -1;

pub(crate) fn list_assets_page_inner(
    state: &AppState,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<AssetPage, String> {
    let (limit, offset) = resolve_page_window(limit, offset)?;
    let assets = state
        .database
        .list_assets_page(limit, offset)
        .map_err(|error| database_error(&error))?;
    let total = state
        .database
        .count_assets("", None)
        .map_err(|error| database_error(&error))?;
    Ok(AssetPage {
        assets,
        total,
        limit,
        offset,
    })
}

pub(crate) fn search_assets_page_inner(
    state: &AppState,
    query: &str,
    tag: Option<&str>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<AssetPage, String> {
    let (limit, offset) = resolve_page_window(limit, offset)?;
    let assets = state
        .database
        .search_assets_page(query, tag, limit, offset)
        .map_err(|error| database_error(&error))?;
    let total = state
        .database
        .count_assets(query, tag)
        .map_err(|error| database_error(&error))?;
    Ok(AssetPage {
        assets,
        total,
        limit,
        offset,
    })
}

pub(crate) fn update_tags_inner(
    state: &AppState,
    asset_id: &str,
    tags: &[String],
) -> Result<(), String> {
    state
        .database
        .update_tags(asset_id, tags)
        .map_err(|error| database_error(&error))
}

pub(crate) fn toggle_favorite_inner(state: &AppState, asset_id: &str) -> Result<(), String> {
    state
        .database
        .toggle_favorite(asset_id)
        .map_err(|error| database_error(&error))
}

pub(crate) fn update_notes_inner(
    state: &AppState,
    asset_id: &str,
    notes: &str,
) -> Result<(), String> {
    state
        .database
        .update_notes(asset_id, notes)
        .map_err(|error| database_error(&error))
}

/// Resolve every managed file an asset owns, refusing anything that is not a
/// regular file inside `data_dir/assets`.
///
/// `ADR-0020`: containment is enforced **per file at deletion time** — never by
/// trusting the stored `file_paths` JSON — and a refusal aborts the whole
/// deletion before anything is removed.
///
/// `canonical_asset_path` cannot be reused directly: it requires the file to
/// exist, so it cannot tell "already deleted" from "outside the root". Treating
/// both as an error makes a half-deleted asset permanently undeletable;
/// treating both as success follows a poisoned path. `symlink_metadata` first
/// separates the two.
fn managed_asset_files(data_dir: &Path, raw_file_paths: &str) -> Result<Vec<PathBuf>, String> {
    let parsed: serde_json::Value = serde_json::from_str(raw_file_paths)
        .map_err(|_| error_json("DATABASE_ERROR", "This asset's file list is unreadable."))?;

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Some(map) = parsed.as_object() {
        for value in map.values() {
            let Some(stored) = value.as_str() else {
                continue;
            };
            let stored = PathBuf::from(stored);
            if !stored.is_absolute() {
                return Err(error_json("INVALID_PATH", INVALID_PATH_MESSAGE));
            }
            if !candidates.contains(&stored) {
                candidates.push(stored);
            }
        }
    }

    let mut asset_root: Option<PathBuf> = None;
    let mut existing: Vec<PathBuf> = Vec::new();

    for path in candidates {
        match std::fs::symlink_metadata(&path) {
            // Already deleted, or never written. Tolerating this is what keeps a
            // half-deleted asset deletable, and it makes a retry converge.
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(_) => {
                return Err(error_json(
                    "FILESYSTEM_ERROR",
                    "A managed asset file could not be inspected.",
                ))
            }
            Ok(metadata) => {
                if metadata.is_dir() || metadata.file_type().is_symlink() {
                    return Err(error_json("INVALID_PATH", INVALID_PATH_MESSAGE));
                }
            }
        }

        // Resolved lazily: a row whose files are all already gone never needs
        // the asset root to exist.
        let root = match &asset_root {
            Some(root) => root.clone(),
            None => {
                let root = data_dir
                    .join("assets")
                    .canonicalize()
                    .map_err(|_| error_json("INVALID_PATH", INVALID_PATH_MESSAGE))?;
                asset_root = Some(root.clone());
                root
            }
        };

        let canonical = path.canonicalize().map_err(|_| {
            error_json(
                "FILESYSTEM_ERROR",
                "A managed asset file could not be resolved.",
            )
        })?;
        if !canonical.starts_with(&root) {
            return Err(error_json("INVALID_PATH", INVALID_PATH_MESSAGE));
        }

        existing.push(canonical);
    }

    Ok(existing)
}

pub(crate) fn delete_asset_inner(state: &AppState, asset_id: &str) -> Result<(), String> {
    let raw_file_paths = state
        .database
        .get_asset_file_paths(asset_id)
        .map_err(|error| database_error(&error))?;

    // Idempotent. A second delete (double-click, or a stale card) reaches the
    // requested end state, so reporting a failure would be a false alarm.
    let Some(raw_file_paths) = raw_file_paths else {
        return Ok(());
    };

    let files = managed_asset_files(&state.data_dir, &raw_file_paths)?;

    // Files BEFORE the row. A record without files is repairable — the record
    // still identifies the asset, so it can be re-downloaded or deleted again.
    // Files without a record is unrecoverable provenance loss, which is the
    // exact failure this ordering exists to avoid.
    for path in &files {
        match std::fs::remove_file(path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => {
                return Err(error_json(
                    "FILESYSTEM_ERROR",
                    "An asset file could not be deleted. The library record was kept so you can try again.",
                ))
            }
        }
    }

    state
        .database
        .delete_asset(asset_id)
        .map_err(|error| database_error(&error))
}

pub(crate) fn get_storage_usage_inner(state: &AppState) -> Result<i64, String> {
    state
        .database
        .get_storage_usage()
        .map_err(|error| database_error(&error))
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn save_completed_task_inner(
    state: &AppState,
    task_id: &str,
    task_type: &str,
    prompt: Option<&str>,
    ai_model: Option<&str>,
    status: &str,
    progress: i64,
    consumed_credits: i64,
    thumbnail_url: Option<&str>,
    artifacts: &[TaskArtifact],
    texture_urls: Option<&serde_json::Value>,
    created_at: i64,
    started_at: i64,
    finished_at: i64,
) -> Result<(), String> {
    let has_textures = texture_urls
        .as_ref()
        .and_then(|v| v.as_array())
        .map(|arr| !arr.is_empty())
        .unwrap_or(false);

    // TPC-04: file_paths is keyed by artifact_storage_key. Pre-download the
    // values are the artifact URLs (the legacy `model_urls` semantic);
    // `download_asset` → `mark_downloaded` later replaces them with local
    // paths under the same keys. An unmappable (role, format) pair or an
    // invalid label is rejected here — never silently dropped (TASK-0031).
    let mut file_paths = serde_json::Map::new();
    for artifact in artifacts {
        let key = artifact_storage_key(artifact.role, &artifact.format, artifact.label.as_deref())
            .map_err(|message| error_json("INVALID_INPUT", message))?;
        file_paths.insert(key, serde_json::Value::String(artifact.url.clone()));
    }
    let file_paths_json = serde_json::Value::Object(file_paths).to_string();

    let texture_paths_json = texture_urls
        .as_ref()
        .map(|v| v.to_string())
        .unwrap_or_else(|| "[]".to_string());

    // TASK-0031 evidence gate: a rig save "sets has_animation appropriately".
    // Derived from the closed artifact roles (never provider strings): an
    // armature artifact or the rig task type means a rig; preset clips, fps
    // variants or motion clips mean animation content exists.
    let has_rig = task_type == "rig" || artifacts.iter().any(|a| a.role == ArtifactRole::Armature);
    let has_animation = matches!(task_type, "animate" | "text-to-motion")
        || artifacts.iter().any(|a| {
            matches!(
                a.role,
                ArtifactRole::PresetClip | ArtifactRole::FpsVariant | ArtifactRole::Motion
            )
        });

    let record = AssetRecord {
        rights: Default::default(),
        id: task_id.to_string(),
        meshy_type: task_type.to_string(),
        parent_task_id: None,
        prompt: prompt.map(|s| s.to_string()),
        image_url: None,
        ai_model: ai_model.map(|s| s.to_string()),
        status: status.to_string(),
        progress,
        consumed_credits,
        thumbnail_path: thumbnail_url.map(|s| s.to_string()),
        file_paths_json,
        texture_paths_json,
        notes: String::new(),
        tags_json: "[]".to_string(),
        created_at,
        started_at,
        finished_at,
        downloaded_at: 0,
        error_message: None,
        has_textures,
        has_rig,
        has_animation,
        favorite: false,
        last_viewed_at: 0,
    };

    state
        .database
        .insert_asset(&record)
        .map_err(|error| database_error(&error))
}

/// Save a completed task as an asset in the database.
/// Called by the frontend when a task reaches SUCCEEDED status.
/// ADR-0015 step 3: the payload is one typed `SaveCompletedTaskArgs` struct
/// under the invoke key `args` (see the struct doc for the Tauri 2 mapping).
#[tauri::command]
pub async fn save_completed_task(
    state: tauri::State<'_, AppState>,
    args: SaveCompletedTaskArgs,
) -> Result<(), String> {
    save_completed_task_inner(
        &state,
        &args.task_id,
        &args.task_type,
        args.prompt.as_deref(),
        args.ai_model.as_deref(),
        &args.status,
        args.progress,
        args.consumed_credits,
        args.thumbnail_url.as_deref(),
        &args.artifacts,
        args.texture_urls.as_ref(),
        args.created_at,
        args.started_at,
        args.finished_at,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::validation::MAX_ASSET_PAGE_SIZE;
    use std::sync::Arc;

    #[test]
    fn test_error_json_format() {
        let result = error_json("DATABASE_ERROR", "connection failed");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "DATABASE_ERROR");
        assert_eq!(parsed["message"], "connection failed");
    }

    #[test]
    fn validates_supported_image_signatures() {
        assert_eq!(
            validated_image_mime(Path::new("image.png"), b"\x89PNG\r\n\x1a\nrest"),
            Ok("image/png")
        );
        assert_eq!(
            validated_image_mime(Path::new("image.jpeg"), b"\xff\xd8\xffrest"),
            Ok("image/jpeg")
        );
        assert_eq!(
            validated_image_mime(Path::new("image.webp"), b"RIFF\x04\x00\x00\x00WEBPrest"),
            Ok("image/webp")
        );
    }

    #[test]
    fn rejects_mismatched_image_extension_and_signature() {
        assert!(validated_image_mime(Path::new("image.png"), b"\xff\xd8\xffrest").is_err());
        assert!(validated_image_mime(Path::new("image.gif"), b"GIF89a").is_err());
    }

    #[test]
    fn confines_revealed_files_to_asset_root() {
        let temp = tempfile::tempdir().unwrap();
        let asset_root = temp.path().join("assets");
        std::fs::create_dir(&asset_root).unwrap();
        let asset = asset_root.join("model.glb");
        let outside = temp.path().join("outside.txt");
        std::fs::write(&asset, b"model").unwrap();
        std::fs::write(&outside, b"private").unwrap();

        assert_eq!(
            canonical_asset_path(temp.path(), asset.to_str().unwrap()),
            Ok(asset.canonicalize().unwrap())
        );
        assert!(canonical_asset_path(temp.path(), outside.to_str().unwrap()).is_err());
    }

    /// A minimal, well-formed GLB — enough for the export path to embed into.
    fn minimal_glb(json_text: &str) -> Vec<u8> {
        let body = json_text.as_bytes();
        let padded = (body.len() + 3) & !3;
        let mut chunk = Vec::new();
        chunk.extend_from_slice(&(padded as u32).to_le_bytes());
        chunk.extend_from_slice(&0x4E4F_534Au32.to_le_bytes()); // "JSON"
        chunk.extend_from_slice(body);
        chunk.resize(8 + padded, b' ');
        let total = 12 + chunk.len();
        let mut out = Vec::new();
        out.extend_from_slice(&0x4654_6C67u32.to_le_bytes()); // "glTF"
        out.extend_from_slice(&2u32.to_le_bytes());
        out.extend_from_slice(&(total as u32).to_le_bytes());
        out.extend_from_slice(&chunk);
        out
    }

    #[test]
    fn export_asset_inner_copies_file_and_writes_the_sidecar() {
        let state = make_state();
        let asset_root = state.data_dir.join("assets");
        std::fs::create_dir_all(&asset_root).unwrap();
        let source = asset_root.join("model.glb");
        std::fs::write(&source, minimal_glb(r#"{"asset":{"version":"2.0"}}"#)).unwrap();

        let mut record = make_asset_record("task-export");
        record.file_paths_json = serde_json::json!({ "glb": source.to_string_lossy() }).to_string();
        record.prompt = Some("a red chair".to_string());
        state.database.insert_asset(&record).unwrap();

        let destination = state.data_dir.join("exported.glb");
        let warning = export_asset_inner(
            &state,
            source.to_str().unwrap(),
            destination.to_str().unwrap(),
            "task-export",
        )
        .unwrap();

        assert!(
            warning.is_none(),
            "a full record must not degrade: {warning:?}"
        );

        // The file was REWRITTEN, not copied: the record is merged into the
        // GLB's own JSON chunk (ADR-0019 shape B, LM-04).
        let mut exported = std::fs::File::open(&destination).unwrap();
        let layout = crate::glb::read_layout(&mut exported).unwrap();
        let document = crate::glb::parse_json(&layout).unwrap();
        assert_eq!(
            document["asset"]["extras"]["meshyforge"]["rights"]["identifier"],
            crate::meshy::models::RIGHTS_NOASSERTION,
            "with Fact A unrecorded every asset derives NOASSERTION"
        );
        assert_eq!(
            document["asset"]["extras"]["meshyforge"]["schemaVersion"],
            1
        );

        // Sibling named by APPENDING to the destination, never by replacing the
        // extension: `exported.glb` -> `exported.glb.meta.json`.
        let sidecar = state.data_dir.join("exported.glb.meta.json");
        let text = std::fs::read_to_string(&sidecar).unwrap();
        let parsed = crate::meshy::models::parse_export_record(&text).unwrap();
        assert_eq!(
            parsed.schema_version,
            crate::meshy::models::EXPORT_SCHEMA_VERSION
        );

        // Q1: a digest travels, never the brief.
        let digest = parsed.prompt_sha256.expect("prompt digest missing");
        assert_eq!(digest.len(), 64);
        assert!(digest.chars().all(|c| c.is_ascii_hexdigit()));
        assert_eq!(digest, digest.to_lowercase());
        assert!(!text.contains("a red chair"), "the prompt must not travel");

        // SEC-F: no absolute paths in the record.
        let data_dir = state.data_dir.to_string_lossy().to_string();
        assert!(
            !text.contains(&data_dir),
            "the sidecar must not name a path"
        );

        // The staged temp file must be gone.
        assert!(!state.data_dir.join("exported.glb.meta.json.tmp").exists());
    }

    /// A `.glb` destination whose source is not actually a GLB must still be
    /// DELIVERED — byte-identical — with a warning. A container we cannot parse
    /// is never handed over half-merged, and the sidecar is still written
    /// because it is the baseline carrier (`LM-02`).
    #[test]
    fn export_asset_inner_degrades_to_a_plain_copy_for_an_unparseable_glb() {
        let state = make_state();
        let asset_root = state.data_dir.join("assets");
        std::fs::create_dir_all(&asset_root).unwrap();
        let source = asset_root.join("model.glb");
        std::fs::write(&source, b"not-actually-glb").unwrap();

        let mut record = make_asset_record("task-export");
        record.file_paths_json = serde_json::json!({ "glb": source.to_string_lossy() }).to_string();
        state.database.insert_asset(&record).unwrap();

        let destination = state.data_dir.join("exported.glb");
        let warning = export_asset_inner(
            &state,
            source.to_str().unwrap(),
            destination.to_str().unwrap(),
            "task-export",
        )
        .unwrap();

        let warning = warning.expect("an unparseable GLB must degrade");
        assert!(warning.contains("without embedded metadata"), "{warning}");
        assert_eq!(std::fs::read(&destination).unwrap(), b"not-actually-glb");
        assert!(state.data_dir.join("exported.glb.meta.json").exists());
        assert!(!state.data_dir.join("exported.glb.embed.tmp").exists());
    }

    /// Containment is checked BEFORE the database is read, so an outside path
    /// is refused even when no row exists for the id.
    #[test]
    fn export_asset_inner_rejects_path_outside_asset_root() {
        let state = make_state();
        std::fs::create_dir_all(state.data_dir.join("assets")).unwrap();
        let outside = state.data_dir.join("outside.glb");
        std::fs::write(&outside, b"private").unwrap();
        let destination = state.data_dir.join("exported.glb");

        let result = export_asset_inner(
            &state,
            outside.to_str().unwrap(),
            destination.to_str().unwrap(),
            "any-id",
        );

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_PATH");
        assert!(!destination.exists());
    }

    /// Mirrors `canonicalize_existing_path_returns_error_for_missing_file`.
    #[test]
    fn export_asset_inner_returns_error_for_missing_source_file() {
        let state = make_state();
        let destination = state.data_dir.join("exported.glb");

        let result = export_asset_inner(
            &state,
            "/nonexistent/path/model.glb",
            destination.to_str().unwrap(),
            "any-id",
        );

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_PATH");
    }

    #[test]
    fn export_asset_inner_returns_fs_error_when_destination_invalid() {
        let state = make_state();
        let asset_root = state.data_dir.join("assets");
        std::fs::create_dir_all(&asset_root).unwrap();
        let source = asset_root.join("model.glb");
        std::fs::write(&source, b"glb-bytes").unwrap();

        let mut record = make_asset_record("task-export");
        record.file_paths_json = serde_json::json!({ "glb": source.to_string_lossy() }).to_string();
        state.database.insert_asset(&record).unwrap();

        // Destination directory does not exist, so the copy fails.
        let destination = state.data_dir.join("missing-dir").join("exported.glb");

        let result = export_asset_inner(
            &state,
            source.to_str().unwrap(),
            destination.to_str().unwrap(),
            "task-export",
        );

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "FILESYSTEM_ERROR");
    }

    /// `SEC-B`: an asset id is not a key to the asset directory. The id must
    /// resolve to a row that actually owns the path being exported.
    #[test]
    fn export_asset_inner_refuses_when_the_id_does_not_own_the_path() {
        let state = make_state();
        let asset_root = state.data_dir.join("assets");
        std::fs::create_dir_all(&asset_root).unwrap();
        let mine = asset_root.join("mine.glb");
        let theirs = asset_root.join("theirs.glb");
        std::fs::write(&mine, b"mine").unwrap();
        std::fs::write(&theirs, b"theirs").unwrap();

        // The row owns `mine.glb`, but we ask to export `theirs.glb`.
        let mut record = make_asset_record("task-export");
        record.file_paths_json = serde_json::json!({ "glb": mine.to_string_lossy() }).to_string();
        state.database.insert_asset(&record).unwrap();

        let destination = state.data_dir.join("exported.glb");
        let result = export_asset_inner(
            &state,
            theirs.to_str().unwrap(),
            destination.to_str().unwrap(),
            "task-export",
        );

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(!destination.exists(), "a refusal must copy nothing");
    }

    /// Ladder rung 2: a missing row degrades the RECORD, never the delivery.
    #[test]
    fn export_asset_inner_still_copies_when_the_asset_is_gone() {
        let state = make_state();
        let asset_root = state.data_dir.join("assets");
        std::fs::create_dir_all(&asset_root).unwrap();
        let source = asset_root.join("model.glb");
        std::fs::write(&source, b"glb-bytes").unwrap();

        let destination = state.data_dir.join("exported.glb");
        let warning = export_asset_inner(
            &state,
            source.to_str().unwrap(),
            destination.to_str().unwrap(),
            "not-in-the-library",
        )
        .unwrap();

        let warning = warning.expect("a missing row must produce a warning");
        assert!(warning.contains("without a rights record"), "{warning}");
        assert_eq!(std::fs::read(&destination).unwrap(), b"glb-bytes");
        assert!(
            !state.data_dir.join("exported.glb.meta.json").exists(),
            "no sidecar may be invented without a row"
        );
    }

    #[test]
    fn update_asset_rights_records_the_predicates_and_derives_the_identifier() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        let rights =
            update_asset_rights_inner(&state, "task-1", "paid", "no", "yes", "unknown").unwrap();

        assert_eq!(rights.identifier, crate::meshy::models::RIGHTS_PAID_OWNED);
        assert!(rights.reason.is_none());
        assert!(
            rights.recorded_at.is_some(),
            "the timestamp is what makes this a RECORDED assertion rather than a NULL"
        );

        // Persisted, and derivable again on read — the identifier is never stored.
        let assets = state.database.get_all_assets().unwrap();
        assert_eq!(
            assets[0].rights.plan_tier_at_generation.as_deref(),
            Some("paid")
        );
        assert_eq!(
            assets[0].rights.identifier,
            crate::meshy::models::RIGHTS_PAID_OWNED
        );
    }

    /// An asserted `'unknown'` tier is a real answer, and derives `NOASSERTION`
    /// for the honest reason — distinguishable from the pre-baseline `NULL` case
    /// because the predicates are present.
    #[test]
    fn update_asset_rights_accepts_a_recorded_unknown_tier() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        let rights =
            update_asset_rights_inner(&state, "task-1", "unknown", "no", "no", "unknown").unwrap();

        assert_eq!(rights.identifier, crate::meshy::models::RIGHTS_NOASSERTION);
        assert_eq!(rights.reason.as_deref(), Some("tier-unrecorded"));
        assert_eq!(rights.plan_tier_at_generation.as_deref(), Some("unknown"));
    }

    #[test]
    fn update_asset_rights_refuses_an_unrecognised_value() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        let error =
            update_asset_rights_inner(&state, "task-1", "enterprise", "no", "yes", "unknown")
                .unwrap_err();

        let parsed: serde_json::Value = serde_json::from_str(&error).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        // Refused, not coerced: the stored predicates are untouched.
        let assets = state.database.get_all_assets().unwrap();
        assert!(assets[0].rights.plan_tier_at_generation.is_none());
    }

    #[test]
    fn update_asset_rights_refuses_an_unknown_asset() {
        let state = make_state();
        let error = update_asset_rights_inner(&state, "missing", "free", "no", "no", "unknown")
            .unwrap_err();
        assert!(error.contains("INVALID_INPUT"), "{error}");
    }

    #[test]
    fn database_error_formats_json_with_database_error_code() {
        let error = rusqlite::Error::InvalidQuery;
        let result = database_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "DATABASE_ERROR");
        assert_eq!(parsed["message"], DATABASE_ERROR_MESSAGE);
    }

    #[test]
    fn canonicalize_existing_path_returns_error_for_missing_file() {
        let result = canonicalize_existing_path("/nonexistent/path/file.glb");
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_PATH");
    }

    #[tokio::test]
    async fn read_file_as_data_uri_encodes_png_file() {
        let temp = tempfile::tempdir().unwrap();
        let png_path = temp.path().join("test.png");
        std::fs::write(&png_path, b"\x89PNG\r\n\x1a\npixel data").unwrap();

        let result = read_file_as_data_uri(png_path.to_str().unwrap().to_string()).await;
        assert!(result.is_ok());
        let data_uri = result.unwrap();
        assert!(data_uri.starts_with("data:image/png;base64,"));
    }

    #[tokio::test]
    async fn read_file_as_data_uri_rejects_unsupported_image_type() {
        let temp = tempfile::tempdir().unwrap();
        let gif_path = temp.path().join("test.gif");
        std::fs::write(&gif_path, b"GIF89a").unwrap();

        let result = read_file_as_data_uri(gif_path.to_str().unwrap().to_string()).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_IMAGE");
    }

    #[tokio::test]
    async fn read_file_as_data_uri_rejects_missing_file() {
        let result = read_file_as_data_uri("/nonexistent/image.png".to_string()).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        // canonicalize_existing_path fails first, returning INVALID_PATH
        assert_eq!(parsed["code"], "INVALID_PATH");
    }

    // ─── Inner function tests (using real AppState + temp DB) ──

    use crate::meshy::models::AssetRecord;

    fn artifact(role: ArtifactRole, format: &str, label: Option<&str>, url: &str) -> TaskArtifact {
        TaskArtifact {
            role,
            format: format.to_string(),
            label: label.map(str::to_string),
            url: url.to_string(),
        }
    }

    fn make_state() -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        // InMemoryKeychain starts empty, so this never observes a real key
        // that may be stored in the OS keychain on the machine running tests.
        AppState::new_with_keychain(dir, Arc::new(crate::security::InMemoryKeychain::new()))
            .unwrap()
    }

    fn make_asset_record(id: &str) -> AssetRecord {
        AssetRecord {
            rights: Default::default(),
            id: id.to_string(),
            meshy_type: "text-to-3d".to_string(),
            parent_task_id: None,
            prompt: Some("a dragon".to_string()),
            image_url: None,
            ai_model: None,
            status: "SUCCEEDED".to_string(),
            progress: 100,
            consumed_credits: 5,
            thumbnail_path: None,
            file_paths_json: "{}".to_string(),
            texture_paths_json: "[]".to_string(),
            notes: "".to_string(),
            tags_json: "[]".to_string(),
            created_at: 1000,
            started_at: 1010,
            finished_at: 1100,
            downloaded_at: 0,
            error_message: None,
            has_textures: false,
            has_rig: false,
            has_animation: false,
            favorite: false,
            last_viewed_at: 0,
        }
    }

    #[test]
    fn save_completed_task_inner_inserts_asset() {
        let state = make_state();
        let result = save_completed_task_inner(
            &state,
            "task-abc",
            "text-to-3d",
            Some("a chair"),
            None,
            "SUCCEEDED",
            100,
            10,
            None,
            &[],
            None,
            1000,
            1010,
            1100,
        );
        assert!(result.is_ok());

        let assets = state.database.get_all_assets().unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, "task-abc");
        assert_eq!(assets[0].prompt, Some("a chair".to_string()));
    }

    /// Regression test for the original `meshy_type`/`taskType` IPC rename bug
    /// (see git history and docs/LESSONS_LEARNED.md #10) — now served by the
    /// typed struct: the hand-written mirror-struct test this replaces existed
    /// only because the command took 13 loose parameters. With
    /// `SaveCompletedTaskArgs`, deserializing the real frontend payload into
    /// the real struct IS the contract check; a renamed field breaks this
    /// test and every caller at once.
    ///
    /// The payload shape mirrors `invoke('save_completed_task', { args })` in
    /// src/hooks/useActiveTaskPolling.ts: Tauri 2 extracts the `args`
    /// parameter by its camelCase key from the payload, so the frontend sends
    /// `{ args: { ... } }` and `payload["args"]` deserializes here.
    #[test]
    fn save_completed_task_args_deserialize_frontend_payload_shape() {
        let invoke_payload = serde_json::json!({
            "args": {
                "taskId": "task-abc",
                "taskType": "multi-image-to-3d",
                "prompt": null,
                "aiModel": null,
                "status": "SUCCEEDED",
                "progress": 100,
                "consumedCredits": 30,
                "thumbnailUrl": "https://assets.meshy.ai/abc/preview.png",
                "artifacts": [
                    { "role": "primary", "format": "glb", "url": "https://assets.meshy.ai/abc/model.glb" }
                ],
                "textureUrls": null,
                "createdAt": 1000,
                "startedAt": 1010,
                "finishedAt": 1100,
            }
        });

        // Exactly what Tauri's generated command wrapper does for the `args`
        // parameter (tauri 2.11.5 ipc::command.rs: payload.get("args")).
        let args: SaveCompletedTaskArgs = serde_json::from_value(invoke_payload["args"].clone())
            .expect(
                "save_completed_task's SaveCompletedTaskArgs no longer matches the camelCase \
                 keys the frontend sends (mapSnapshotToSaveArgs in useActiveTaskPolling.ts)",
            );

        // Feed the deserialized args into the real command body so this test
        // also fails to *compile* if save_completed_task_inner's parameter
        // list or types drift from the struct.
        let state = make_state();
        let result = save_completed_task_inner(
            &state,
            &args.task_id,
            &args.task_type,
            args.prompt.as_deref(),
            args.ai_model.as_deref(),
            &args.status,
            args.progress,
            args.consumed_credits,
            args.thumbnail_url.as_deref(),
            &args.artifacts,
            args.texture_urls.as_ref(),
            args.created_at,
            args.started_at,
            args.finished_at,
        );
        assert!(result.is_ok());

        let assets = state.database.get_all_assets().unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, "task-abc");
        assert_eq!(assets[0].task_type, "multi-image-to-3d");
        // TPC-04: the primary artifact's URL is stored under the bare `glb` key.
        assert_eq!(
            assets[0].file_paths["glb"],
            "https://assets.meshy.ai/abc/model.glb"
        );
    }

    #[test]
    fn save_completed_task_inner_with_textures_sets_has_textures() {
        let state = make_state();
        let textures = serde_json::json!([{"baseColor": "url"}]);
        save_completed_task_inner(
            &state,
            "task-tex",
            "text-to-3d",
            None,
            None,
            "SUCCEEDED",
            100,
            10,
            None,
            &[],
            Some(&textures),
            1000,
            1010,
            1100,
        )
        .unwrap();

        let assets = state.database.get_all_assets().unwrap();
        assert!(assets[0].has_textures);
    }

    #[test]
    fn save_completed_task_inner_with_artifacts_stores_role_keyed_json() {
        let state = make_state();
        let artifacts = vec![
            artifact(
                ArtifactRole::Primary,
                "glb",
                None,
                "https://assets.meshy.ai/m.glb",
            ),
            artifact(
                ArtifactRole::PresetClip,
                "glb",
                Some("walking"),
                "https://assets.meshy.ai/walking.glb",
            ),
            artifact(
                ArtifactRole::PreRemeshed,
                "glb",
                None,
                "https://assets.meshy.ai/pre.glb",
            ),
        ];
        save_completed_task_inner(
            &state,
            "task-models",
            "text-to-3d",
            None,
            None,
            "SUCCEEDED",
            100,
            10,
            None,
            &artifacts,
            None,
            1000,
            1010,
            1100,
        )
        .unwrap();

        let assets = state.database.get_all_assets().unwrap();
        // TPC-04 keys: primary bare, others role[-label]-qualified.
        assert_eq!(assets[0].file_paths["glb"], "https://assets.meshy.ai/m.glb");
        assert_eq!(
            assets[0].file_paths["presetClip-walking.glb"],
            "https://assets.meshy.ai/walking.glb"
        );
        assert_eq!(
            assets[0].file_paths["preRemeshed.glb"],
            "https://assets.meshy.ai/pre.glb"
        );
    }

    /// TASK-0031 (save side): an artifact whose (role, format) pair is not in
    /// the closed TPC-04 mapping is an INVALID_INPUT rejection, not a silent
    /// drop — a task response's artifacts must never be quietly discarded.
    #[test]
    fn save_completed_task_inner_rejects_unmappable_artifact() {
        let state = make_state();
        let artifacts = vec![artifact(
            ArtifactRole::Primary,
            "exe",
            None,
            "https://assets.meshy.ai/model.exe",
        )];
        let result = save_completed_task_inner(
            &state,
            "task-bad",
            "text-to-3d",
            None,
            None,
            "SUCCEEDED",
            100,
            10,
            None,
            &artifacts,
            None,
            1000,
            1010,
            1100,
        );
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        // Nothing was persisted.
        assert!(state.database.get_all_assets().unwrap().is_empty());
    }

    /// TASK-0031 evidence gate: a rig save "sets has_animation appropriately".
    /// has_rig/has_animation are derived from the closed artifact roles and
    /// the task type — a rig save with walking preset clips is flagged.
    #[test]
    fn save_completed_task_inner_derives_rig_and_animation_flags() {
        let state = make_state();
        let rig_artifacts = vec![
            artifact(
                ArtifactRole::Primary,
                "glb",
                None,
                "https://assets.meshy.ai/r.glb",
            ),
            artifact(
                ArtifactRole::PresetClip,
                "glb",
                Some("walking"),
                "https://assets.meshy.ai/w.glb",
            ),
            artifact(
                ArtifactRole::Armature,
                "glb",
                Some("walking"),
                "https://assets.meshy.ai/wa.glb",
            ),
        ];
        save_completed_task_inner(
            &state,
            "task-rig",
            "rig",
            None,
            None,
            "SUCCEEDED",
            100,
            0,
            None,
            &rig_artifacts,
            None,
            1000,
            1010,
            1100,
        )
        .unwrap();

        // A plain text-to-3d save stays unflagged.
        save_completed_task_inner(
            &state,
            "task-plain",
            "text-to-3d-preview",
            None,
            None,
            "SUCCEEDED",
            100,
            5,
            None,
            &[artifact(
                ArtifactRole::Primary,
                "glb",
                None,
                "https://assets.meshy.ai/p.glb",
            )],
            None,
            1000,
            1010,
            1100,
        )
        .unwrap();

        let assets = state.database.get_all_assets().unwrap();
        let rig = assets.iter().find(|a| a.id == "task-rig").unwrap();
        assert!(rig.has_rig);
        assert!(rig.has_animation);
        let plain = assets.iter().find(|a| a.id == "task-plain").unwrap();
        assert!(!plain.has_rig);
        assert!(!plain.has_animation);
    }

    #[test]
    fn get_all_assets_returns_empty_when_no_assets() {
        let state = make_state();
        let assets = state.database.get_all_assets().unwrap();
        assert!(assets.is_empty());
    }

    #[test]
    fn search_assets_returns_matching_assets() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();
        state
            .database
            .insert_asset(&make_asset_record("task-2"))
            .unwrap();

        let results = state.database.search_assets("dragon", None).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn update_tags_inner_updates_tags() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        let tags = vec!["fantasy".to_string(), "creature".to_string()];
        update_tags_inner(&state, "task-1", &tags).unwrap();

        let assets = state.database.get_all_assets().unwrap();
        assert!(assets[0].tags.iter().any(|t| t == "fantasy"));
    }

    #[test]
    fn get_all_tags_inner_returns_empty_when_no_assets() {
        let state = make_state();
        assert!(get_all_tags_inner(&state).unwrap().is_empty());
    }

    #[test]
    fn get_all_tags_inner_matches_update_tags_writes() {
        // Pins the IPC-visible contract end to end: what `update_tags_inner`
        // writes is exactly what `get_all_tags_inner` reads back.
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        update_tags_inner(
            &state,
            "task-1",
            &["creature".to_string(), "fantasy".to_string()],
        )
        .unwrap();

        assert_eq!(
            get_all_tags_inner(&state).unwrap(),
            vec!["creature".to_string(), "fantasy".to_string()]
        );
    }

    // ─── Page window resolution (DAT-01) ──────────────────────────

    #[test]
    fn resolve_page_window_defaults_to_the_catalog_page_size() {
        assert_eq!(resolve_page_window(Some(50), Some(0)).unwrap(), (50, 0));
        // A lone limit is page 0 of that size; a lone offset implies the
        // catalog page size starting at that offset.
        assert_eq!(resolve_page_window(Some(10), None).unwrap(), (10, 0));
        assert_eq!(
            resolve_page_window(None, Some(100)).unwrap(),
            (DEFAULT_ASSET_PAGE_SIZE, 100)
        );
    }

    #[test]
    fn resolve_page_window_treats_both_absent_as_unbounded() {
        assert_eq!(
            resolve_page_window(None, None).unwrap(),
            (UNBOUNDED_LIMIT, 0),
            "the unpaged mode must be an explicit sentinel, not the default page size"
        );
    }

    #[test]
    fn resolve_page_window_rejects_out_of_range_windows() {
        // Fail-closed at the IPC boundary rather than silently coercing.
        assert!(resolve_page_window(Some(0), None).is_err());
        assert!(resolve_page_window(Some(-5), None).is_err());
        assert!(resolve_page_window(None, Some(-1)).is_err());
        assert!(
            resolve_page_window(Some(MAX_ASSET_PAGE_SIZE + 1), None).is_err(),
            "an unbounded limit would re-create the whole-table fetch"
        );
        assert!(resolve_page_window(Some(MAX_ASSET_PAGE_SIZE), None).is_ok());
    }

    #[test]
    fn list_assets_page_inner_pages_and_reports_the_total() {
        let state = make_state();
        for i in 1..=3 {
            state
                .database
                .insert_asset(&make_asset_record(&format!("task-{i}")))
                .unwrap();
        }

        let first = list_assets_page_inner(&state, Some(2), Some(0)).unwrap();
        assert_eq!(first.assets.len(), 2);
        assert_eq!(
            first.total, 3,
            "total is the full match count, not the page size"
        );
        assert_eq!(first.limit, 2);

        let second = list_assets_page_inner(&state, Some(2), Some(2)).unwrap();
        assert_eq!(second.assets.len(), 1, "the remainder is on the last page");
    }

    #[test]
    fn list_assets_page_inner_returns_everything_when_unpaged() {
        // The unpaged mode exists for consumers that filter client-side and
        // therefore need the whole set (the task picker). If it silently
        // returned one page, those consumers would hide eligible tasks.
        let state = make_state();
        for i in 1..=120 {
            state
                .database
                .insert_asset(&make_asset_record(&format!("task-{i}")))
                .unwrap();
        }

        let page = list_assets_page_inner(&state, None, None).unwrap();
        assert_eq!(page.assets.len(), 120);
        assert_eq!(page.total, 120);
    }

    #[test]
    fn list_assets_page_inner_rejects_a_negative_offset() {
        let state = make_state();
        let result = list_assets_page_inner(&state, Some(10), Some(-1));
        assert!(
            result.is_err(),
            "a negative offset is a caller bug and must not reach SQL"
        );
    }

    #[test]
    fn toggle_favorite_inner_flips_favorite() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        toggle_favorite_inner(&state, "task-1").unwrap();
        let assets = state.database.get_all_assets().unwrap();
        assert!(assets[0].favorite);

        toggle_favorite_inner(&state, "task-1").unwrap();
        let assets = state.database.get_all_assets().unwrap();
        assert!(!assets[0].favorite);
    }

    #[test]
    fn update_notes_inner_updates_notes() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        update_notes_inner(&state, "task-1", "my notes").unwrap();
        let assets = state.database.get_all_assets().unwrap();
        assert_eq!(assets[0].notes, "my notes");
    }

    #[test]
    fn delete_asset_inner_removes_asset() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();
        assert_eq!(state.database.get_all_assets().unwrap().len(), 1);

        delete_asset_inner(&state, "task-1").unwrap();
        assert!(state.database.get_all_assets().unwrap().is_empty());
    }

    /// A record whose `file_paths` is empty (`{}`) must still delete cleanly —
    /// the pre-existing test above covers that, and this one pins the row that
    /// has real files attached.
    #[test]
    fn delete_asset_inner_removes_managed_files() {
        let state = make_state();
        let asset_root = state.data_dir.join("assets");
        std::fs::create_dir_all(&asset_root).unwrap();
        let file = asset_root.join("task-1.glb");
        std::fs::write(&file, b"glb-bytes").unwrap();

        let mut record = make_asset_record("task-1");
        record.file_paths_json = serde_json::json!({ "glb": file.to_string_lossy() }).to_string();
        state.database.insert_asset(&record).unwrap();

        delete_asset_inner(&state, "task-1").unwrap();

        assert!(!file.exists(), "the managed file must be removed");
        assert!(state.database.get_all_assets().unwrap().is_empty());
    }

    /// ADR-0020 / SEC-C: a `file_paths` value that escapes `data_dir/assets` is
    /// refused, AND the refusal must leave both the file and the record intact.
    /// A refusal that deleted the row would make the file untraceable.
    #[test]
    fn delete_asset_inner_refuses_outside_asset_root_and_keeps_row() {
        let state = make_state();
        std::fs::create_dir_all(state.data_dir.join("assets")).unwrap();
        let outside = state.data_dir.join("private.glb");
        std::fs::write(&outside, b"not-ours").unwrap();

        let mut record = make_asset_record("task-1");
        record.file_paths_json =
            serde_json::json!({ "glb": outside.to_string_lossy() }).to_string();
        state.database.insert_asset(&record).unwrap();

        let error = delete_asset_inner(&state, "task-1").unwrap_err();

        assert!(
            error.contains("INVALID_PATH"),
            "expected INVALID_PATH, got {error}"
        );
        assert!(
            outside.exists(),
            "a refused deletion must not remove the file"
        );
        assert_eq!(
            state.database.get_all_assets().unwrap().len(),
            1,
            "the record must survive a refusal"
        );
    }

    /// SEC-C: a stored path that resolves to a directory (or a symlink) is
    /// refused rather than recursively removed.
    #[test]
    fn delete_asset_inner_refuses_directory_target() {
        let state = make_state();
        let directory = state.data_dir.join("assets").join("nested");
        std::fs::create_dir_all(&directory).unwrap();

        let mut record = make_asset_record("task-1");
        record.file_paths_json =
            serde_json::json!({ "glb": directory.to_string_lossy() }).to_string();
        state.database.insert_asset(&record).unwrap();

        let error = delete_asset_inner(&state, "task-1").unwrap_err();

        assert!(
            error.contains("INVALID_PATH"),
            "expected INVALID_PATH, got {error}"
        );
        assert!(directory.exists());
    }

    /// A half-deleted asset (files already gone) must still be deletable, and
    /// this must not require the asset root to exist at all — otherwise a
    /// missing directory would make the record permanently undeletable.
    #[test]
    fn delete_asset_inner_tolerates_already_deleted_file() {
        let state = make_state();
        let missing = state.data_dir.join("assets").join("gone.glb");

        let mut record = make_asset_record("task-1");
        record.file_paths_json =
            serde_json::json!({ "glb": missing.to_string_lossy() }).to_string();
        state.database.insert_asset(&record).unwrap();

        delete_asset_inner(&state, "task-1").unwrap();

        assert!(state.database.get_all_assets().unwrap().is_empty());
    }

    /// A second delete reaches the same end state, so it is a success rather
    /// than an error — a double-click must not surface a failure toast.
    #[test]
    fn delete_asset_inner_is_idempotent() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        delete_asset_inner(&state, "task-1").unwrap();
        assert!(delete_asset_inner(&state, "task-1").is_ok());
    }

    #[test]
    fn get_storage_usage_inner_returns_count() {
        let state = make_state();
        // No downloaded assets → 0
        assert_eq!(get_storage_usage_inner(&state).unwrap(), 0);

        // Insert a downloaded asset
        let mut record = make_asset_record("task-1");
        record.downloaded_at = 5000;
        state.database.insert_asset(&record).unwrap();

        assert_eq!(get_storage_usage_inner(&state).unwrap(), 1);
    }
}
