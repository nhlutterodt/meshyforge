// MeshyForge — OS Keychain Integration
//
// Source: TDD §11, TSS §11
//
// Stores the Meshy API key in the OS keychain (Windows Credential Manager,
// macOS Keychain, Linux secret service). Never written to SQLite, never
// logged, never sent to the frontend in plaintext.

use keyring::Entry;

const SERVICE_NAME: &str = "meshyforge";
const ACCOUNT_NAME: &str = "meshy_api_key";

#[derive(Debug, thiserror::Error)]
pub enum KeychainError {
    #[error("Keychain error: {0}")]
    Keyring(#[from] keyring::Error),
    #[error("No API key found in keychain")]
    NotFound,
}

/// Store the API key in the OS keychain.
pub fn store_key(key: &str) -> Result<(), KeychainError> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)?;
    entry.set_password(key)?;
    Ok(())
}

/// Retrieve the API key from the OS keychain.
pub fn get_key() -> Result<Option<String>, KeychainError> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(KeychainError::Keyring(e)),
    }
}

/// Delete the API key from the OS keychain.
pub fn delete_key() -> Result<(), KeychainError> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted is fine
        Err(e) => Err(KeychainError::Keyring(e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // These tests interact with the real OS keychain.
    // They are marked #[ignore] by default because they require a real
    // keychain backend and may fail in CI or sandboxed environments.
    // Run with: cargo test -- --ignored

    #[test]
    #[ignore]
    fn test_store_and_get_key() {
        // These tests interact with the real OS keychain.
        // They should work on any platform with a keychain backend.
        // Clean up any existing key first.
        let _ = delete_key();

        let test_key = "msy_test_key_12345";
        let result = store_key(test_key);
        assert!(result.is_ok(), "Failed to store key: {:?}", result);

        let retrieved = get_key();
        assert!(retrieved.is_ok(), "Failed to get key: {:?}", retrieved);
        assert_eq!(retrieved.unwrap(), Some(test_key.to_string()));

        // Clean up
        let _ = delete_key();
    }

    #[test]
    #[ignore]
    fn test_get_key_when_not_set() {
        // Ensure no key is set
        let _ = delete_key();

        let result = get_key();
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    #[test]
    #[ignore]
    fn test_delete_key() {
        // Store a key first
        let _ = store_key("msy_temp_key");
        let result = delete_key();
        assert!(result.is_ok(), "Failed to delete key: {:?}", result);

        // Verify it's gone
        let retrieved = get_key();
        assert!(retrieved.is_ok());
        assert_eq!(retrieved.unwrap(), None);
    }

    #[test]
    #[ignore]
    fn test_delete_key_when_not_set() {
        // Ensure no key is set
        let _ = delete_key();

        // Deleting a non-existent key should not error
        let result = delete_key();
        assert!(result.is_ok());
    }
}
