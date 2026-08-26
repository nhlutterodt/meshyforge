import { describe, expect, it } from 'vitest';
import providerSource from '../../src-tauri/src/provider/meshy.rs?raw';
import providerModSource from '../../src-tauri/src/provider/mod.rs?raw';
import tauriConfigSource from '../../src-tauri/tauri.conf.json?raw';
import viteConfigSource from '../../vite.config.ts?raw';
import detailSource from '../components/gallery/AssetDetail.tsx?raw';
import previewSource from '../components/gallery/AssetPreview3D.tsx?raw';

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
});
