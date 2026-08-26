import { describe, expect, it } from 'vitest';
import cargoTomlSource from '../../src-tauri/Cargo.toml?raw';
import providerSource from '../../src-tauri/src/provider/meshy.rs?raw';
import providerModSource from '../../src-tauri/src/provider/mod.rs?raw';
import tauriConfigSource from '../../src-tauri/tauri.conf.json?raw';
import viteConfigSource from '../../vite.config.ts?raw';
import detailSource from '../components/gallery/AssetDetail.tsx?raw';
import previewSource from '../components/gallery/AssetPreview3D.tsx?raw';
import apiKeyManagerSource from '../components/settings/ApiKeyManager.tsx?raw';

describe('runtime regression guardrails', () => {
  it('keeps the preview off the Drei root barrel', () => {
    expect(previewSource).not.toMatch(/from\s+['"]@react-three\/drei['"]/);
    for (const helper of ['Bounds', 'Center', 'ContactShadows', 'Gltf', 'OrbitControls']) {
      expect(previewSource).toContain(`from '@react-three/drei/core/${helper}.js'`);
    }
  });

  it('preserves the Drei antivirus prebundle exclusion', () => {
    expect(viteConfigSource).toContain("exclude: ['@react-three/drei']");
  });

  it('allows only local Tauri asset fetch origins in connect-src', () => {
    const tauriConfig = JSON.parse(tauriConfigSource) as {
      app: {
        security: {
          csp: string;
          assetProtocol: { enable: boolean; scope: string[] };
        };
      };
    };
    const connectDirective = tauriConfig.app.security.csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('connect-src '));

    expect(connectDirective).toBeDefined();
    const connectSources = connectDirective?.split(/\s+/).slice(1) ?? [];
    expect(connectSources).toEqual(
      expect.arrayContaining([
        "'self'",
        'ipc:',
        'http://ipc.localhost',
        'asset:',
        'http://asset.localhost',
        'https://asset.localhost',
      ]),
    );
    expect(connectSources).not.toContain('*');
    expect(connectSources.some((source) => source.includes('meshy.ai'))).toBe(false);
    expect(tauriConfig.app.security.assetProtocol).toEqual({
      enable: true,
      scope: ['$APPDATA/assets/**'],
    });
  });

  it('contains lazy preview import failures inside the detail panel', () => {
    expect(detailSource).toContain('.catch(() => ({ default: PreviewLoadError }))');
    expect(detailSource).toContain('role="alert"');
  });

  it('prohibits Environment preset imports and external CDN origins (VP-12)', () => {
    // VP-12: no Environment import in the preview
    expect(previewSource).not.toMatch(/Environment/);
    // VP-12: no external CDN origin in connect-src (only local Tauri origins)
    const tauriConfig = JSON.parse(tauriConfigSource) as {
      app: { security: { csp: string } };
    };
    const connectDirective = tauriConfig.app.security.csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('connect-src '));
    const connectSources = connectDirective?.split(/\s+/).slice(1) ?? [];
    // No source should be an external https:// origin (only 'self', ipc:, asset: protocol origins)
    expect(
      connectSources.some(
        (source) => source.startsWith('https://') && !source.includes('asset.localhost'),
      ),
    ).toBe(false);
  });

  it('converts camelCase request keys to snake_case before sending to the Meshy API', () => {
    // Regression guard: the Rust backend must include a camelCase-to-snake_case
    // converter that runs on every create-task request body. Without this, the
    // frontend sends camelCase keys (imageUrl, aiModel, shouldTexture) that the
    // Meshy API rejects with a 400 "Either image_url or input_task_id must be
    // provided" error.
    //
    // Per ADR-0004, the converter was moved from commands/api.rs to
    // provider/meshy.rs — the command layer no longer performs wire-format
    // conversion; the provider handles its own wire format internally.
    expect(providerSource).toContain('fn camel_to_snake_keys');
    expect(providerSource).toContain('fn camel_to_snake');
    // The provider trait must exist
    expect(providerModSource).toContain('trait TaskProvider');
    // The provider must implement the trait for MeshyClient
    expect(providerSource).toContain('impl TaskProvider for MeshyClient');
    // The provider must map TaskType to endpoints
    expect(providerSource).toContain('fn endpoint_for');
    // The provider must handle download host allowlisting
    expect(providerSource).toContain('fn allowed_download_hosts');
  });

  it('keeps a real OS keychain backend enabled for `keyring` (no silent mock fallback)', () => {
    // Regression guard: `keyring = "3"` with no feature flags has NO default
    // backend — keyring-rs silently falls back to an in-memory mock with no
    // persistence and no state shared between separate Entry::new() calls.
    // Every save-then-get looked empty regardless of a real prior save, on
    // every platform, since the dependency was first added. Cargo.lock's
    // resolved deps for `keyring` were only ["log", "zeroize"] — no
    // windows-sys, security-framework, or D-Bus crate anywhere.
    const keyringLine = cargoTomlSource.split('\n').find((line) => /^\s*keyring\s*=/.test(line));
    expect(keyringLine).toBeDefined();
    expect(keyringLine).toContain('windows-native');
    expect(keyringLine).toContain('apple-native');
    // async-secret-service (pure-Rust zbus), not sync-secret-service, which
    // binds the system libdbus-1 C library and would need a new CI package.
    // ("async-secret-service" contains "sync-secret-service" as a plain
    // substring — 'a' + 'sync...' — so this must check for the quoted,
    // delimited feature token, not a bare substring.)
    expect(keyringLine).toContain('async-secret-service');
    expect(keyringLine).not.toMatch(/["']sync-secret-service["']/);
  });

  it('keeps reqwest trusting the OS certificate store, not only a bundled CA list', () => {
    // Regression guard: `rustls-tls` (= `rustls-tls-webpki-roots`) trusts
    // only a bundled Mozilla CA list, not the OS certificate store. Every
    // real Meshy API call failed at the TLS handshake ("invalid peer
    // certificate: UnknownIssuer") on any machine where an HTTPS-scanning
    // antivirus or corporate TLS-inspecting proxy is trusted by the OS but
    // not by rustls's bundled list — indistinguishable from a wrong API key
    // to the user, since validate_api_key mapped every failure to `false`.
    // `curl` (schannel/security-framework, which use the OS store) worked
    // fine on the same machine, proving it was a trust-store mismatch.
    const reqwestLine = cargoTomlSource.split('\n').find((line) => /^\s*reqwest\s*=/.test(line));
    expect(reqwestLine).toBeDefined();
    expect(reqwestLine).toContain('rustls-tls-native-roots');
    expect(reqwestLine).not.toMatch(/["']rustls-tls["']/);
  });

  it('trims the API key before it is sent to validate_api_key or set_api_key', () => {
    // Regression guard: the button-enabled check used apiKey.trim(), but the
    // value actually transmitted did not. Incidental copy-paste whitespace
    // (a trailing newline from `cat`, a triple-click browser selection)
    // silently changes the Bearer token even though the key itself is
    // correct, and reports identically to a genuinely wrong key.
    expect(apiKeyManagerSource).toMatch(/invoke[^;]*validate_api_key[^;]*trimmedKey/s);
    expect(apiKeyManagerSource).toMatch(/invoke[^;]*set_api_key[^;]*trimmedKey/s);
    expect(apiKeyManagerSource).not.toMatch(
      /invoke<boolean>\('validate_api_key',\s*\{\s*key:\s*apiKey\s*\}\)/,
    );
    expect(apiKeyManagerSource).not.toMatch(/invoke\('set_api_key',\s*\{\s*key:\s*apiKey\s*\}\)/);
  });
});
