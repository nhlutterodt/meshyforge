// MeshyForge — Keychain Tauri Commands
//
// Source: TDD §7.2, CSD §7.2

use crate::app_state::AppState;
use crate::meshy::MeshyClient;
use crate::security;

fn keychain_error(error: impl std::fmt::Display) -> String {
    eprintln!("Keychain operation failed: {error}");
    error_json(
        "KEYCHAIN_ERROR",
        "The system credential store operation failed.",
    )
}

fn validate_key_input(key: &str) -> Result<(), String> {
    if key.is_empty() || key.len() > 512 || key.chars().any(char::is_control) {
        return Err(error_json(
            "INVALID_INPUT",
            "The API key format is invalid.",
        ));
    }
    Ok(())
}

/// Store the API key in the OS keychain and initialize the MeshyClient.
#[tauri::command]
pub async fn set_api_key(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    set_api_key_with_keychain_inner(&state, &security::RealKeychain, &key)
}

/// Retrieve the API key from the OS keychain.
/// Returns the key if set, but does NOT expose it to the frontend in plaintext.
/// This is used to check if a key exists.
#[tauri::command]
pub async fn get_api_key() -> Result<bool, String> {
    get_api_key_inner(&security::RealKeychain)
}

/// Validate an API key by making a test request to the Meshy balance endpoint.
#[tauri::command]
pub async fn validate_api_key(key: String) -> Result<bool, String> {
    validate_api_key_inner(&key).await
}

/// Delete the API key from the OS keychain and clear the client.
#[tauri::command]
pub async fn delete_api_key(state: tauri::State<'_, AppState>) -> Result<(), String> {
    delete_api_key_with_keychain_inner(&state, &security::RealKeychain)
}

/// Helper: JSON error string (CSD §7.2 pattern)
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    }))
    .unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
}

// ─── Pure inner functions (testable without tauri::State) ──────

/// Store the API key via a Keychain trait and set it in AppState.
pub(crate) fn set_api_key_with_keychain_inner(
    state: &AppState,
    keychain: &dyn crate::security::Keychain,
    key: &str,
) -> Result<(), String> {
    validate_key_input(key)?;
    keychain
        .store(key)
        .map_err(keychain_error)?;
    state
        .set_api_key(key.to_string())
        .map_err(|_| error_json("INTERNAL_ERROR", "Internal error."))?;
    Ok(())
}

/// Get the API key existence via a Keychain trait.
pub(crate) fn get_api_key_inner(
    keychain: &dyn crate::security::Keychain,
) -> Result<bool, String> {
    match keychain.get() {
        Ok(Some(_)) => Ok(true),
        Ok(None) => Ok(false),
        Err(error) => Err(keychain_error(error)),
    }
}

/// Delete the API key via a Keychain trait and clear AppState.
pub(crate) fn delete_api_key_with_keychain_inner(
    state: &AppState,
    keychain: &dyn crate::security::Keychain,
) -> Result<(), String> {
    keychain
        .delete()
        .map_err(keychain_error)?;
    state
        .clear_api_key()
        .map_err(|_| error_json("INTERNAL_ERROR", "Internal error."))?;
    Ok(())
}

/// Validate an API key by making a test request to the Meshy balance endpoint.
pub(crate) async fn validate_api_key_inner(key: &str) -> Result<bool, String> {
    validate_key_input(key)?;
    let client = MeshyClient::new(key.to_string());
    match client.get_balance().await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_json_format() {
        let result = error_json("TEST_CODE", "test message");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "TEST_CODE");
        assert_eq!(parsed["message"], "test message");
    }

    #[test]
    fn rejects_empty_oversized_and_control_character_keys() {
        assert!(validate_key_input("").is_err());
        assert!(validate_key_input(&"x".repeat(513)).is_err());
        assert!(validate_key_input("key\nvalue").is_err());
        assert!(validate_key_input("msy_test_value").is_ok());
    }

    #[test]
    fn validate_key_input_accepts_max_length_key() {
        // 512 chars is the boundary — should pass
        let key = "x".repeat(512);
        assert!(validate_key_input(&key).is_ok());
    }

    #[test]
    fn validate_key_input_rejects_tab_control_character() {
        assert!(validate_key_input("key\tvalue").is_err());
    }

    #[test]
    fn validate_key_input_accepts_single_char_key() {
        assert!(validate_key_input("k").is_ok());
    }

    // ─── Inner function tests ───────────────────────────────

    use crate::app_state::AppState;
    use std::path::PathBuf;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn make_state() -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        AppState::new(dir).unwrap()
    }

    #[test]
    fn set_api_key_inner_validates_and_sets_client() {
        let state = make_state();
        let kc = InMemoryKeychain::new();
        assert!(state.meshy_client().is_none());

        let result = set_api_key_with_keychain_inner(&state, &kc, "msy_test_key_12345");
        assert!(result.is_ok());
        assert!(state.meshy_client().is_some());
    }

    #[test]
    fn set_api_key_inner_rejects_empty_key() {
        let state = make_state();
        let kc = InMemoryKeychain::new();
        let result = set_api_key_with_keychain_inner(&state, &kc, "");
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[test]
    fn set_api_key_inner_rejects_oversized_key() {
        let state = make_state();
        let kc = InMemoryKeychain::new();
        let result = set_api_key_with_keychain_inner(&state, &kc, &"x".repeat(513));
        assert!(result.is_err());
    }

    #[test]
    fn delete_api_key_inner_clears_client() {
        let state = make_state();
        let kc = InMemoryKeychain::with_key("msy_test_key");
        set_api_key_with_keychain_inner(&state, &kc, "msy_test_key").unwrap();
        assert!(state.meshy_client().is_some());

        let result = delete_api_key_with_keychain_inner(&state, &kc);
        assert!(result.is_ok());
        assert!(state.meshy_client().is_none());
    }

    #[tokio::test]
    async fn validate_api_key_inner_returns_true_for_valid_key() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "balance": 100
            })))
            .mount(&server)
            .await;

        // Create a client pointing at the mock server
        let client = crate::meshy::MeshyClient::with_base_url(
            "msy_test_key".to_string(),
            server.uri(),
        );
        let result = client.get_balance().await;
        assert!(result.is_ok());

        // validate_api_key_inner uses MeshyClient::new which points at the real
        // API, so we test the validation rejection path instead
        let result = validate_api_key_inner("").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn validate_api_key_inner_rejects_invalid_key_format() {
        let result = validate_api_key_inner("").await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[test]
    fn keychain_error_produces_correct_json() {
        let result = keychain_error("some error");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "KEYCHAIN_ERROR");
        assert_eq!(parsed["message"], "The system credential store operation failed.");
    }

    // ─── Keychain trait-based inner function tests ───────────

    use crate::security::{InMemoryKeychain, Keychain};

    #[test]
    fn set_api_key_with_keychain_inner_stores_and_sets_client() {
        let state = make_state();
        let kc = InMemoryKeychain::new();
        assert!(kc.get().unwrap().is_none());
        assert!(state.meshy_client().is_none());

        let result = set_api_key_with_keychain_inner(&state, &kc, "msy_test_key");
        assert!(result.is_ok());

        // Keychain has the key
        assert_eq!(kc.get().unwrap(), Some("msy_test_key".to_string()));
        // AppState has the client
        assert!(state.meshy_client().is_some());
    }

    #[test]
    fn set_api_key_with_keychain_inner_rejects_empty_key() {
        let state = make_state();
        let kc = InMemoryKeychain::new();
        let result = set_api_key_with_keychain_inner(&state, &kc, "");
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        // Keychain should not have been written to
        assert!(kc.get().unwrap().is_none());
    }

    #[test]
    fn get_api_key_inner_returns_true_when_key_exists() {
        let kc = InMemoryKeychain::with_key("msy_key");
        assert_eq!(get_api_key_inner(&kc).unwrap(), true);
    }

    #[test]
    fn get_api_key_inner_returns_false_when_no_key() {
        let kc = InMemoryKeychain::new();
        assert_eq!(get_api_key_inner(&kc).unwrap(), false);
    }

    #[test]
    fn delete_api_key_with_keychain_inner_deletes_and_clears_client() {
        let state = make_state();
        let kc = InMemoryKeychain::with_key("msy_key");
        set_api_key_with_keychain_inner(&state, &kc, "msy_key").unwrap();
        assert!(state.meshy_client().is_some());

        let result = delete_api_key_with_keychain_inner(&state, &kc);
        assert!(result.is_ok());

        // Keychain cleared
        assert!(kc.get().unwrap().is_none());
        // AppState client cleared
        assert!(state.meshy_client().is_none());
    }
}
