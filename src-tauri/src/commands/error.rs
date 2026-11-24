// MeshyForge — shared IPC error envelope
//
// Source: CSD §7.1 (IPC-01), CSD §7.2, CSD §10.2 (error code catalog)
//
// Every `#[tauri::command]` returns `Result<T, String>` (IPC-01), and that
// `String` is a JSON-encoded `{code, message}` object. This module is the
// single producer of that envelope.
//
// Why `String` and not a typed `Err` variant: IPC-01 and
// `.claude/rules/ipc-contract.md` fix the convention at
// `Result<T, String>`. A typed error struct would change every command
// signature and the transport contract at once, so the code set is
// centralized *inside* the string builder instead — one place to change,
// no signature churn.
//
// Before this module existed the identical helper was copied into `api.rs`,
// `assets.rs`, `keychain.rs`, `recovery.rs` and `settings.rs`. Five copies of
// a wire contract is five chances to drift; the envelope shape now has one
// definition.
//
// `message` is expected to be already sanitized by the caller: it must never
// contain an API key, a signed download URL, or driver text (IPC-06,
// SEC-02). Codes must come from the CSD §10.2 catalog so the frontend can
// act on them; unknown codes still cross (the envelope never hides a new
// code), they just have no catalogued user action.

/// Build the `{code, message}` JSON error string that crosses IPC (CSD §7.2).
///
/// The `format!` fallback is unreachable for any `&str` pair — `serde_json`
/// cannot fail to serialize two string fields — but the envelope must never
/// panic at the command boundary, so the fallback is kept rather than
/// `unwrap()`.
pub(crate) fn error_json(code: &str, message: &str) -> String {
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
    fn error_json_produces_the_documented_envelope() {
        let parsed: serde_json::Value =
            serde_json::from_str(&error_json("INVALID_INPUT", "Prompt is required.")).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert_eq!(parsed["message"], "Prompt is required.");
        // The envelope is exactly two fields: `parseError` in src/lib/tauri.ts
        // reads `code`/`message`, and the optional `details` branch stays
        // unproduced until a command deliberately adds context.
        assert_eq!(parsed.as_object().map(|o| o.len()), Some(2));
    }

    #[test]
    fn error_json_survives_quotes_and_newlines_in_the_message() {
        // The format! fallback would produce invalid JSON for a message
        // containing a quote or newline; serde_json must be the path taken.
        let message = "Bad \"input\"\nwith a newline";
        let parsed: serde_json::Value =
            serde_json::from_str(&error_json("INVALID_INPUT", message)).unwrap();
        assert_eq!(parsed["message"], message);
    }
}
