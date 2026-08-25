# Security Policy

## Supported Version

MeshyForge security fixes are applied to the current `1.x` release line. Pre-release builds and older local builds should be upgraded before reporting an issue that may already be resolved.

## Reporting a Vulnerability

Do not disclose suspected vulnerabilities, credentials, signed asset URLs, database contents, or local filesystem paths in a public issue, pull request, discussion, or chat transcript.

Use the repository's private security-advisory channel where available. Include the affected version, operating system, reproduction steps, expected impact, and a redacted proof of concept. Never include a live Meshy API key.

## Credential Handling

MeshyForge accepts a Meshy API key only through the in-app Settings screen. The Rust backend stores it in the operating system credential store and keeps the raw value out of frontend state, SQLite, environment files, logs, and repository content.

- Do not create `.env` files containing Meshy credentials.
- Do not place credentials in source code, tests, screenshots, logs, issue text, or AI-assistant memory.
- Treat Meshy signed asset URLs as temporary credentials and do not publish them.
- Revoke and rotate a key immediately if it may have been exposed. Deleting a local copy does not invalidate a compromised key.

## Local Data

Application data is stored under the operating system's application-data directory. Downloaded assets are confined to MeshyForge's managed asset directory, and reveal operations reject paths outside that directory. Uploaded images are checked by extension and file signature before use.

Back up exported assets separately. Deleting an asset from MeshyForge removes its managed local files.

## Security Boundaries

- The WebView does not call Meshy directly; network access is mediated by Rust commands.
- Task endpoints and task IDs are allowlisted and validated before network requests.
- Asset downloads require HTTPS URLs on Meshy's asset host and use fixed local filenames.
- SQL statements are parameterized.
- Internal database, filesystem, keychain, and panic details are not returned over IPC.
- Tauri capabilities and CSP remain restricted to the permissions and local origins required by the application.

## Repository Guardrails

CI rejects tracked files containing realistic Meshy API-key patterns and reports filenames only. GitHub secret scanning and dependency alerts should remain enabled. Both `package-lock.json` and `src-tauri/Cargo.lock` are committed for reproducible application builds.
