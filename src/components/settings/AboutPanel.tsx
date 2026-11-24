// src/components/settings/AboutPanel.tsx
// Source: FRD FR-SET-04, CSD §5

import { Separator } from '@components/ui/separator';
import { APP_NAME, APP_VERSION } from '@lib/constants';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

export function AboutPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">About</h3>
      <Separator />
      <div className="space-y-2 text-sm text-text-secondary">
        <div className="flex justify-between">
          <span>Application</span>
          <span className="font-medium text-text-primary">{APP_NAME}</span>
        </div>
        <div className="flex justify-between">
          <span>Version</span>
          <span className="font-mono text-text-primary">{APP_VERSION}</span>
        </div>
        <div className="flex justify-between">
          <span>API Status</span>
          <a
            href="https://status.meshy.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-accent hover:text-accent-hover"
          >
            status.meshy.ai
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <Separator />
      <ThirdPartyNotices />
    </div>
  );
}

/**
 * Third-party licence notices, loaded on demand.
 *
 * `THIRD_PARTY_NOTICES.md` is a generated legal artifact (see
 * `scripts/generate-third-party-notices.mjs` and obligations O-1/O-2/O-3/O-5 in
 * `docs/legal-metadata-baseline.md` §4). It is ~280 KB, so it is imported
 * dynamically and only when the owner opens it: never in the main bundle, never
 * at startup, and never through IPC — a `?raw` import needs no command, no path
 * parameter, and no permission.
 */
function ThirdPartyNotices() {
  const [notices, setNotices] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function load() {
    try {
      const module = await import('../../../THIRD_PARTY_NOTICES.md?raw');
      setNotices(module.default);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Third-party licences</h3>
      <p className="text-sm text-text-secondary">
        MeshyForge bundles open-source software. The full notice bundle — every package, its
        licence, and the licence text — ships with each release.
      </p>
      {notices === null && !failed && (
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-border px-3 py-1 text-sm text-accent hover:text-accent-hover"
        >
          Show licence notices
        </button>
      )}
      {failed && (
        <p className="text-sm text-text-secondary">
          The notice bundle could not be loaded here. See <code>THIRD_PARTY_NOTICES.md</code> in the
          release.
        </p>
      )}
      {notices !== null && (
        <pre className="max-h-80 overflow-auto rounded-md border border-border bg-surface p-3 text-xs whitespace-pre-wrap">
          {notices}
        </pre>
      )}
    </div>
  );
}
