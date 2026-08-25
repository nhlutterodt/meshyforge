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
    validate_key_input(&key)?;
    security::store_key(&key).map_err(keychain_error)?;

    // Initialize the client in AppState
    state
        .set_api_key(key)
        .map_err(|_| error_json("INTERNAL_ERROR", "Internal error."))?;

    Ok(())
}

/// Retrieve the API key from the OS keychain.
/// Returns the key if set, but does NOT expose it to the frontend in plaintext.
/// This is used to check if a key exists.
#[tauri::command]
pub async fn get_api_key() -> Result<bool, String> {
    match security::get_key() {
        Ok(Some(_)) => Ok(true),
        Ok(None) => Ok(false),
        Err(error) => Err(keychain_error(error)),
    }
}

/// Validate an API key by making a test request to the Meshy balance endpoint.
#[tauri::command]
pub async fn validate_api_key(key: String) -> Result<bool, String> {
    validate_key_input(&key)?;
    let client = MeshyClient::new(key);
    match client.get_balance().await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Delete the API key from the OS keychain and clear the client.
#[tauri::command]
pub async fn delete_api_key(state: tauri::State<'_, AppState>) -> Result<(), String> {
    security::delete_key().map_err(keychain_error)?;
    state
        .clear_api_key()
        .map_err(|_| error_json("INTERNAL_ERROR", "Internal error."))?;
    Ok(())
}

/// Helper: JSON error string (CSD §7.2 pattern)
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    }))
    .unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
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
}
