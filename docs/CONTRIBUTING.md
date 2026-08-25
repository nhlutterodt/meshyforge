# Contributing to MeshyForge

Thank you for your interest in contributing to MeshyForge! This document covers development setup, code conventions, testing, and the PR process.

## Development Setup

### Prerequisites

- **Node.js** 22+ (with npm)
- **Rust** 1.75+ (install via [rustup](https://rustup.rs/))
- Platform-specific dependencies (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

### Getting Started

```bash
# Clone the repository
git clone https://github.com/nhlutterodt/meshyforge.git
cd meshyforge

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

Enter a development API key through the app's **Settings** screen. It is stored in the operating system credential store. Never place a Meshy key in an environment file, source file, test fixture, terminal transcript, issue, or chat.

### Windows-Specific Setup

Windows contributors should follow these additional steps to avoid common pitfalls.

#### Install Prerequisites

```powershell
# Install Rust toolchain
winget install --id Rustlang.Rustup

# Install Node.js (if not already installed)
winget install --id OpenJS.NodeJS
```

After installing Rust, **refresh your PATH** so `cargo` and `rustc` are available in the current terminal:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

Verify the installations:

```powershell
node --version    # Should print v22 or higher
rustc --version   # Should print 1.75.0 or higher
cargo --version   # Should match rustc
```

#### npm SSL Certificate Issue (Norton Antivirus)

If you use Norton Antivirus (or another security suite that injects its own CA certificates), `npm install` may hang with an `unable to get local issuer certificate` error. This happens because Norton sets `NODE_EXTRA_CA_CERTS` to its own certificate file, which overrides Node's built-in root store.

**Fix:** Export all Windows root certificates to a PEM file and point npm at it:

```powershell
# Export all Windows root certs to a PEM file
$certs = Get-ChildItem "Cert:\LocalMachine\Root"
$pemPath = "$env:USERPROFILE\node-extra-ca-certs.pem"
$pemContent = ""
foreach ($cert in $certs) {
  $pemContent += "-----BEGIN CERTIFICATE-----`n"
  $pemContent += [Convert]::ToBase64String($cert.RawData, [Base64FormattingOptions]::InsertLineBreaks)
  $pemContent += "`n-----END CERTIFICATE-----`n`n"
}
[System.IO.File]::WriteAllText($pemPath, $pemContent)

# Configure npm to use the exported certs
npm config set cafile "$env:USERPROFILE\node-extra-ca-certs.pem"

# Also set the environment variable for the current user
[System.Environment]::SetEnvironmentVariable("NODE_EXTRA_CA_CERTS", "$env:USERPROFILE\node-extra-ca-certs.pem", "User")
```

You only need to do this once per machine. After that, `npm install` should proceed normally.

#### First-Launch API Key

When the app launches, go to **Settings**, paste your Meshy API key, and click **Save**. The key is stored in the Windows Credential Manager — no `.env` file, no plaintext on disk. You only need to do this once per machine.

### Common Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 1420) |
| `npm run tauri dev` | Start full Tauri app in dev mode |
| `npm run build` | Production build (frontend only) |
| `npm run tauri build` | Build platform installer |
| `npm run test` | Run Vitest test suite |
| `npm run test:guardrails` | Check runtime import, CSP, and preview containment invariants |
| `npm run lint` | Run Biome linter |
| `npm run type-check` | Run TypeScript type check |
| `cargo clippy` | Run Rust linter (from `src-tauri/`) |
| `cargo test` | Run Rust unit tests (from `src-tauri/`) |

### Secret Hygiene

- Never commit API keys, signed asset URLs, credentials, private keys, local databases, or exported application data.
- Before pushing, inspect staged filenames and run the tracked-key scan used by CI. The scan prints filenames only and must never print matching lines.
- If a key may have been exposed, revoke and rotate it in Meshy immediately. Removing the text from Git or local files is not sufficient.
- Keep `package-lock.json` and `src-tauri/Cargo.lock` committed. MeshyForge is an application, so both lockfiles are part of its reproducible security baseline.
- Report vulnerabilities through the private process in `../SECURITY.md`, not a public issue.

## Code Conventions

MeshyForge follows the Coding Standards Document (CSD) strictly. Key rules:

- **Components**: Named function declarations, no default exports, named `Props` interfaces
- **State**: Zustand for UI state, TanStack Query for server state, `useState` for forms
- **IPC**: All Tauri calls go through `src/lib/tauri.ts`, never direct `@tauri-apps/api` imports
- **Naming**: PascalCase for components, camelCase for hooks, kebab-case for utility files
- **Tests**: Co-located test files (`Component.tsx` + `Component.test.tsx`)
- **Max 200 lines** per component — extract sub-components if exceeding

See `coding_standards.md` for the full specification.

## Testing

### Frontend

- Unit tests: Vitest + Testing Library
- Integration tests: Testing Library with mocked Tauri invoke
- E2E tests: Playwright (Phase 5)

```bash
npm run test          # Run all tests
npm run test:guardrails # Run runtime architecture guardrails
npm run test:watch    # Watch mode
npm run test:ui       # UI mode
```

### Desktop Runtime Regressions

Browser-only and mocked component tests do not validate Tauri asset-protocol fetches, WebView CSP behavior, generated dependency modules, or the complete task-to-gallery pipeline. Changes to task polling, persistence, asset URLs, Vite dependency optimization, CSP, or the 3D preview must also be exercised in `npm run tauri dev`.

Use a real completed Meshy task and verify:

1. Task creation immediately adds an entry to Task Monitor.
2. Polling reaches a terminal state and stops.
3. A successful task is saved to SQLite and its files are downloaded locally.
4. Gallery invalidation displays the new local thumbnail without restarting the app.
5. Opening the asset displays the downloaded GLB and leaves the surrounding detail UI responsive.
6. Orbit and zoom work, and returning to Gallery unmounts the preview without console errors.

Do not weaken antivirus, CSP, or asset-protocol scope to make a development build pass. Verify package integrity first, isolate generated bundler output where necessary, and preserve local-only CSP origins. See `docs/LESSONS_LEARNED.md` for incident details and resolution patterns.

### Backend

- Unit tests: `cargo test` with `wiremock` for HTTP mocking
- Keychain tests: Marked `#[ignore]` — run with `cargo test -- --ignored`

## PR Process

1. Create a feature branch: `feat/my-feature` or `fix/my-bugfix`
2. Write tests for your changes
3. Ensure all checks pass: `npm run lint`, `npm run type-check`, `npm run test`, `npm run test:guardrails`, `cargo clippy`, `cargo test`
4. Create a PR with:
   - Clear title (Conventional Commits format)
   - Description of changes
   - Test evidence
5. Request review

### PR Size

- No PR may span more than 3 build phases
- Most PRs should be scoped to a single file or tightly related group
- Maximum 500-line diff per PR

## Documentation

- Design documents live in `docs/` and are kept in sync with the codebase
- Update `README.md` when setup instructions change
- Update `docs/CHANGELOG.md` for every release

## Historical Reference

This project was developed in a private repository (`nhlutterodt/asset-hub`). The public repository starts from a clean commit to ensure no sensitive data is exposed. The private repo serves as the development history archive and is not publicly accessible.

## License

MeshyForge is released under the [MIT License](../LICENSE). By contributing to this project, you agree that your contributions are licensed under the same MIT terms.

### Developer Certificate of Origin (DCO)

Contributors must certify that they have the right to submit their contributions under the project's license. By submitting a pull request, you certify that your contribution satisfies the [Developer Certificate of Origin](https://developercertificate.org/):

> Developer Certificate of Origin
> Version 1.1
>
> Copyright (C) 2004, 2006 The Linux Foundation. All rights reserved.
>
> By making a contribution to this project, I certify that:
>
> (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
>
> (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
>
> (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
>
> (d) I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project's policies, as well as a free open source project's standard practices.

To sign off, add `Signed-off-by: Your Name <your.email@example.com>` to your commit message, or use `git commit --signoff`.

## License

MIT — see `LICENSE` file.