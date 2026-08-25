# MeshyForge

> AI-powered 3D asset studio for generating, managing, and exporting 3D models via the Meshy API.

## Screenshot

<!-- Screenshot of the app -->

## Features

- **Text-to-3D & Image-to-3D** — Generate 3D models from text prompts or reference images
- **Post-processing** — Remesh, retexture, convert, resize, rig, and animate models
- **Image Generation** — Text-to-image and image-to-image for reference creation
- **Print Tools** — Multi-color 3MF, mesh analysis, and repair
- **Creative Lab** — Seven two-stage prototype-to-build workflows
- **Asset Library** — Gallery with 3D preview, tagging, search, and batch export
- **Task Monitor** — Real-time progress tracking with OS notifications
- **Secure API Key Storage** — OS keychain integration (no plaintext keys on disk)

## Prerequisites

- **Node.js** 22+ (with npm)
- **Rust** 1.75+ (install via [rustup](https://rustup.rs/))
- **Windows**: WebView2 Runtime (pre-installed on Windows 10/11)
- **macOS**: Xcode Command Line Tools
- **Linux**: `webkit2gtk` and related dependencies (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

## Setup

### Quick Start

```bash
# Clone the repository
git clone https://github.com/nhlutterodt/meshyforge.git
cd meshyforge

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

On first launch, open **Settings** and enter your Meshy API key. MeshyForge validates it and stores it in the operating system credential store; no environment file is used.

### Windows-Specific Setup

Windows contributors should follow these steps to avoid common pitfalls.

#### 1. Install Prerequisites

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

#### 2. npm SSL Certificate Issue (Norton Antivirus)

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

#### 3. Install Dependencies & Run

```powershell
npm install
npm run tauri dev
```

#### 4. First-Launch API Key

When the app launches, go to **Settings**, paste your Meshy API key, and click **Save**. The key is stored in the Windows Credential Manager — no `.env` file, no plaintext on disk. You only need to do this once per machine.

> **Note:** This project was developed in a private repository. The public repository starts from a clean commit to ensure no sensitive data is exposed. The full development history is preserved in the private archive.

## Build

```bash
# Build production installer for the current platform
npm run tauri build

# The installer will be in src-tauri/target/release/bundle/
```

## Download

Download the latest release for your platform:

- **Windows** (x64): [MeshyForge-x64.msi](https://github.com/nhlutterodt/meshyforge/releases/latest)
- **macOS** (Apple Silicon): [MeshyForge-ARM64.dmg](https://github.com/nhlutterodt/meshyforge/releases/latest)
- **macOS** (Intel): [MeshyForge-Intel.dmg](https://github.com/nhlutterodt/meshyforge/releases/latest)
- **Linux** (x64): [MeshyForge-x64.AppImage](https://github.com/nhlutterodt/meshyforge/releases/latest)

See all releases: [Releases page](https://github.com/nhlutterodt/meshyforge/releases)

## Documentation

- [User Guide](user_guide.md)
- [Security Policy](SECURITY.md)
- [Technical Design Document](technical_design_document.md)
- [Tech Stack Specification](technical_stack_documentation.md)
- [UI/UX Documentation](UI_UX_Documentation.md)
- [Coding Standards](coding_standards.md)
- [Feature Requirements](feature_requirements_documentation.md)
- [Repository Expectations](Github_Repository_Expectations.md)
- [Implementation Execution Plan](implementation_execution_plan.md)

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Framework** | Tauri 2 (Rust backend) |
| **Frontend** | React 19 + TypeScript 5.7 |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **State** | Zustand (UI) + TanStack Query (server) |
| **3D Preview** | React Three Fiber + Three.js |
| **Database** | SQLite (rusqlite) |
| **Secret Storage** | OS Keychain (keyring crate) |
| **Testing** | Vitest + Testing Library + Playwright |

See the [Tech Stack Specification](technical_stack_documentation.md) for the full technology baseline.

## License

MIT