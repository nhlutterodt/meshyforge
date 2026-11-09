---
paths:
  - "src-tauri/src/**/*.rs"
  - "src-tauri/migrations/**/*.sql"
---

# Rust backend rules

- Follow `docs/coding_standards.md` §§6–7, 10–12 and
  `docs/security_threat_model.md`; these are the detailed standards.
- Keep provider HTTP behavior behind `TaskProvider`; commands coordinate
  validated inputs with shared `AppState`, storage, and other backend services.
- Validate command inputs before network, filesystem, or database side effects.
  Reuse existing validators; constrain downloaded URLs to provider allowlists
  and canonicalize file paths before access.
- Use parameterized SQLite queries. Add schema changes as the next sequential
  migration and register them in the migration list; do not edit an applied
  migration to change an existing database.
- Keep secrets in the keychain and out of logs, command errors, and persisted
  application data. Sanitize errors at the IPC boundary.
- Prefer explicit `Result` propagation and testable inner functions. Use
  injected test doubles and temporary databases rather than real user keychain
  entries or application data.
- Any new or changed `#[tauri::command]` must have matching frontend call
  sites/types through `src/lib/tauri.ts` and be registered in
  `src-tauri/src/lib.rs`.
