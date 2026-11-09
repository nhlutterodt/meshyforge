---
paths:
  - "src/lib/tauri.ts"
  - "src/lib/meshy-types.ts"
  - "src/hooks/**/*.ts"
  - "src/hooks/**/*.tsx"
  - "src-tauri/src/commands/**/*.rs"
  - "src-tauri/src/lib.rs"
---

# Tauri IPC contract

- Treat frontend and Rust command changes as one contract change. Inspect both
  callers and command registration before editing.
- Only `src/lib/tauri.ts` may import `@tauri-apps/api/core` or the Tauri event
  API. Frontend callers use its typed `invoke`, `onEvent`, and `assetUrl`
  helpers.
- Rust commands use snake_case names, owned serializable arguments, and the
  project's `Result<T, String>` error convention. Validate arguments before
  invoking a provider or touching persistent/local state.
- Register every added command in the `tauri::generate_handler!` list in
  `src-tauri/src/lib.rs`; remove obsolete registrations when removing a
  command.
- Keep TypeScript types, Rust serialization, command argument names, event
  names/payloads, and behavior synchronized. Preserve provider wire-format
  conventions rather than normalizing raw API data without checking callers.
- Add or update focused tests on both sides where behavior or data shape
  changes. Run the IPC boundary audit skill for substantial contract changes.

See `docs/coding_standards.md` §7 and the IPC/decoupling requirements it cites
for the complete contract.
