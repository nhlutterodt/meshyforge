// MeshyForge — OS Keychain Integration
//
// Source: TDD §11, TSS §11
//
// Stores the Meshy API key in the OS keychain (Windows Credential Manager,
// macOS Keychain, Linux secret service). Never written to SQLite, never
// logged, never sent to the frontend in plaintext.

use keyring::Entry;
use std::sync::Mutex;

const SERVICE_NAME: &str = "meshyforge";
const ACCOUNT_NAME: &str = "meshy_api_key";

#[derive(Debug, thiserror::Error)]
pub enum KeychainError {
    #[error("Keychain error: {0}")]
    Keyring(#[from] keyring::Error),
    #[error("No API key found in keychain")]
    NotFound,
}

/// Abstraction over OS keychain operations so commands can be tested
/// with an in-memory mock instead of the real OS keychain.
pub trait Keychain: Send + Sync {
    fn store(&self, key: &str) -> Result<(), KeychainError>;
    fn get(&self) -> Result<Option<String>, KeychainError>;
    fn delete(&self) -> Result<(), KeychainError>;
}

/// Real OS keychain implementation using the `keyring` crate.
pub struct RealKeychain;

impl Keychain for RealKeychain {
    fn store(&self, key: &str) -> Result<(), KeychainError> {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)?;
        entry.set_password(key)?;
        Ok(())
    }

    fn get(&self) -> Result<Option<String>, KeychainError> {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)?;
        match entry.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(KeychainError::Keyring(e)),
        }
    }

    fn delete(&self) -> Result<(), KeychainError> {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(KeychainError::Keyring(e)),
        }
    }
}

/// In-memory keychain mock for testing.
pub struct InMemoryKeychain {
    store: Mutex<Option<String>>,
}

impl InMemoryKeychain {
    pub fn new() -> Self {
        Self {
            store: Mutex::new(None),
        }
    }

    pub fn with_key(key: &str) -> Self {
        Self {
            store: Mutex::new(Some(key.to_string())),
        }
    }
}

impl Default for InMemoryKeychain {
    fn default() -> Self {
        Self::new()
    }
}

impl Keychain for InMemoryKeychain {
    fn store(&self, key: &str) -> Result<(), KeychainError> {
        *self.store.lock().unwrap() = Some(key.to_string());
        Ok(())
    }

    fn get(&self) -> Result<Option<String>, KeychainError> {
        Ok(self.store.lock().unwrap().clone())
    }

    fn delete(&self) -> Result<(), KeychainError> {
        *self.store.lock().unwrap() = None;
        Ok(())
    }
}

// ─── Free function wrappers (used by production code) ───────────

/// Store the API key in the OS keychain.
pub fn store_key(key: &str) -> Result<(), KeychainError> {
    RealKeychain.store(key)
}

/// Retrieve the API key from the OS keychain.
pub fn get_key() -> Result<Option<String>, KeychainError> {
    RealKeychain.get()
}

/// Delete the API key from the OS keychain.
pub fn delete_key() -> Result<(), KeychainError> {
    RealKeychain.delete()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─── In-memory keychain tests (always run, no #[ignore]) ───

    /// Regression guard for a bug where `keyring = "3"` had no platform
    /// feature enabled: with none selected, the crate silently resolves
    /// to its built-in mock backend instead of erroring — no panic, no
    /// I/O error, just an in-memory store with no state shared across
    /// separate `Entry::new()` calls, so `store()` followed by `get()`
    /// always returned empty. `Entry::new()` performs no OS keychain I/O
    /// by itself (only the credential-builder lookup that decides which
    /// backend to use), so this runs safely without real keychain access
    /// — unlike the `#[ignore]`d tests below, which perform an actual
    /// store/get/delete round trip.
    ///
    /// Scoped to Windows/macOS only: their backends resolve synchronously
    /// against a local OS API. Linux's Secret Service backend talks to an
    /// external D-Bus daemon that may not be running in a CI sandbox —
    /// the same reason the real-round-trip tests below are `#[ignore]`d.
    #[test]
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    fn real_keychain_uses_a_real_os_backend_not_the_mock() {
        let entry = keyring::Entry::new("meshyforge-backend-guardrail", "probe")
            .expect("Entry::new should not require real keychain I/O to construct");
        let credential = entry.get_credential();
        assert!(
            credential
                .downcast_ref::<keyring::mock::MockCredential>()
                .is_none(),
            "keyring resolved to the in-memory mock backend instead of a real OS \
             credential store — check that Cargo.toml's `keyring` dependency has \
             the platform feature enabled for this target (windows-native / \
             apple-native / async-secret-service)"
        );
    }

    #[test]
    fn in_memory_store_and_get_roundtrip() {
        let kc = InMemoryKeychain::new();
        assert!(kc.get().unwrap().is_none());

        kc.store("msy_test_key_12345").unwrap();
        assert_eq!(kc.get().unwrap(), Some("msy_test_key_12345".to_string()));

        kc.delete().unwrap();
        assert!(kc.get().unwrap().is_none());
    }

    #[test]
    fn in_memory_delete_when_already_empty_is_ok() {
        let kc = InMemoryKeychain::new();
        // Deleting when nothing is stored should succeed
        assert!(kc.delete().is_ok());
    }

    #[test]
    fn in_memory_with_key_constructor() {
        let kc = InMemoryKeychain::with_key("preset_key");
        assert_eq!(kc.get().unwrap(), Some("preset_key".to_string()));
    }

    #[test]
    fn in_memory_store_overwrites_previous_key() {
        let kc = InMemoryKeychain::new();
        kc.store("key_one").unwrap();
        kc.store("key_two").unwrap();
        assert_eq!(kc.get().unwrap(), Some("key_two".to_string()));
    }

    #[test]
    fn real_keychain_trait_methods_exist() {
        // Verify RealKeychain implements Keychain — just check it compiles
        let _kc = RealKeychain;
    }

    // ─── Real OS keychain tests (#[ignore] — run with --ignored) ──
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
    }

    #[test]
    #[ignore]
    fn test_delete_key_when_not_set() {
        // Ensure no key is set
        let _ = delete_key();

        let result = delete_key();
        assert!(result.is_ok());
    }
}
