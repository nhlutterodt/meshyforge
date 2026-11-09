// MeshyForge — Settings Tauri Commands
//
// Exposes the existing `Database::get_setting`/`set_setting` storage through
// the IPC boundary. Frontend callers (usePromptPresets) previously invoked
// phantom `get_setting`/`set_setting` names that were never registered.

use crate::app_state::AppState;

/// Maximum accepted length (in characters) of a setting value.
const MAX_VALUE_CHARS: usize = 1_000_000;

/// Helper: JSON error string (CSD §7.2 pattern)
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    }))
    .unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
}

fn database_read_error(error: &rusqlite::Error) -> String {
    log::error!("Database operation failed: {error}");
    error_json("DATABASE_ERROR", "Could not read the setting.")
}

fn database_write_error(error: &rusqlite::Error) -> String {
    log::error!("Database operation failed: {error}");
    error_json("DATABASE_ERROR", "Could not write the setting.")
}

/// Validate a setting key against `^[a-z][a-z0-9_]{0,63}$`: a lowercase ASCII
/// letter followed by up to 63 lowercase letters, digits or underscores.
/// Allowlist-only (same approach as `sanitize_cache_key`), so path separators,
/// dots and traversal sequences are rejected by construction.
fn validate_setting_key(key: &str) -> Result<(), String> {
    let valid = !key.is_empty()
        && key.chars().count() <= 64
        && key
            .chars()
            .next()
            .is_some_and(|first| first.is_ascii_lowercase())
        && key
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_');
    if valid {
        Ok(())
    } else {
        Err(error_json(
            "INVALID_INPUT",
            "The setting key format is invalid.",
        ))
    }
}

fn validate_setting_value(value: &str) -> Result<(), String> {
    if value.chars().count() > MAX_VALUE_CHARS {
        return Err(error_json(
            "INVALID_INPUT",
            "The setting value is too long.",
        ));
    }
    Ok(())
}

/// Read a setting value. Returns `None` when the key has never been stored.
#[tauri::command]
pub async fn get_setting(
    state: tauri::State<'_, AppState>,
    key: String,
) -> Result<Option<String>, String> {
    get_setting_inner(&state, &key)
}

/// Store (insert or replace) a setting value.
#[tauri::command]
pub async fn set_setting(
    state: tauri::State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    set_setting_inner(&state, &key, &value)
}

// ─── Pure inner functions (testable without tauri::State) ──────

pub(crate) fn get_setting_inner(state: &AppState, key: &str) -> Result<Option<String>, String> {
    validate_setting_key(key)?;
    state
        .database
        .get_setting(key)
        .map_err(|error| database_read_error(&error))
}

pub(crate) fn set_setting_inner(state: &AppState, key: &str, value: &str) -> Result<(), String> {
    // Validate before any database side effect.
    validate_setting_key(key)?;
    validate_setting_value(value)?;
    state
        .database
        .set_setting(key, value)
        .map_err(|error| database_write_error(&error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    fn make_test_state() -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        AppState::new_with_keychain(dir, Arc::new(crate::security::InMemoryKeychain::new()))
            .unwrap()
    }

    fn error_code(error: &str) -> String {
        let parsed: serde_json::Value =
            serde_json::from_str(error).expect("error string must be valid JSON");
        parsed["code"].as_str().unwrap_or("").to_string()
    }

    #[test]
    fn set_and_get_setting_round_trip() {
        let state = make_test_state();
        set_setting_inner(&state, "prompt_presets", "[{\"name\":\"a\"}]")
            .expect("valid key and value must be accepted");
        let value = get_setting_inner(&state, "prompt_presets").expect("read must succeed");
        assert_eq!(value.as_deref(), Some("[{\"name\":\"a\"}]"));
    }

    #[test]
    fn set_setting_replaces_previous_value() {
        let state = make_test_state();
        set_setting_inner(&state, "theme", "dark").unwrap();
        set_setting_inner(&state, "theme", "light").unwrap();
        assert_eq!(
            get_setting_inner(&state, "theme").unwrap().as_deref(),
            Some("light")
        );
    }

    #[test]
    fn get_setting_returns_none_for_missing_key() {
        let state = make_test_state();
        assert_eq!(get_setting_inner(&state, "never_set").unwrap(), None);
    }

    #[test]
    fn set_setting_rejects_uppercase_key() {
        let state = make_test_state();
        let error = set_setting_inner(&state, "Prompt_Presets", "x").unwrap_err();
        assert_eq!(error_code(&error), "INVALID_INPUT");
    }

    #[test]
    fn set_setting_rejects_path_like_key() {
        let state = make_test_state();
        for key in ["../etc/passwd", "a/b", "a\\b", "settings.key", ".hidden"] {
            let error = set_setting_inner(&state, key, "x").unwrap_err();
            assert_eq!(
                error_code(&error),
                "INVALID_INPUT",
                "key {key:?} must be rejected"
            );
        }
    }

    #[test]
    fn set_setting_rejects_empty_key() {
        let state = make_test_state();
        let error = set_setting_inner(&state, "", "x").unwrap_err();
        assert_eq!(error_code(&error), "INVALID_INPUT");
    }

    #[test]
    fn set_setting_rejects_key_longer_than_64_chars() {
        let state = make_test_state();
        let key = format!("a{}", "b".repeat(64));
        let error = set_setting_inner(&state, &key, "x").unwrap_err();
        assert_eq!(error_code(&error), "INVALID_INPUT");
    }

    #[test]
    fn set_setting_rejects_overlong_value() {
        let state = make_test_state();
        let value = "a".repeat(MAX_VALUE_CHARS + 1);
        let error = set_setting_inner(&state, "prompt_presets", &value).unwrap_err();
        assert_eq!(error_code(&error), "INVALID_INPUT");
    }

    #[test]
    fn get_setting_rejects_invalid_key_before_database() {
        let state = make_test_state();
        let error = get_setting_inner(&state, "Bad Key").unwrap_err();
        assert_eq!(error_code(&error), "INVALID_INPUT");
    }

    #[test]
    fn error_json_never_leaks_driver_text() {
        let message = error_json("DATABASE_ERROR", "Could not read the setting.");
        let parsed: serde_json::Value = serde_json::from_str(&message).unwrap();
        assert_eq!(parsed["code"], "DATABASE_ERROR");
        assert_eq!(parsed["message"], "Could not read the setting.");
    }
}
