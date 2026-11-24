// src/components/gallery/RightsEditor.tsx
// ADR-0022 / LM-01: the capture path for the per-asset rights record.
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { useUpdateAssetRights } from '@hooks/useUpdateAssetRights';
import type { AssetRow, PlanTier, RightsPredicate } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

const TIERS: readonly PlanTier[] = ['unknown', 'free', 'paid'];
const PREDICATES: readonly RightsPredicate[] = ['unknown', 'yes', 'no'];

/**
 * Human copy for the derivation's reason codes.
 *
 * This map is why the frontend can say "not established" WITHOUT naming the
 * rights vocabulary: `rights-derivation.guardrail.test.ts` fails the build if an
 * identifier appears under `src/` outside `meshy-types.ts`, so the caveat is
 * keyed on `reason` and the identifier itself is only ever echoed verbatim.
 */
const REASON_COPY: Record<string, string> = {
  'tier-unrecorded': 'plan tier not recorded',
  'published-to-community': 'published to the Meshy Community',
  'material-unattested': 'third-party material not attested',
};

/** What the user should read instead of a bare identifier. */
export function rightsSummary(rights: AssetRow['rights']): string {
  if (!rights.reason) return rights.identifier;
  return `Not established — ${REASON_COPY[rights.reason] ?? 'not recorded'}`;
}

interface RightsEditorProps {
  readonly asset: AssetRow;
}

export function RightsEditor({ asset }: RightsEditorProps) {
  const update = useUpdateAssetRights();
  // Empty string means "not recorded yet". It is NOT a value the command
  // accepts, which is the point: there is no way to write NULL back.
  const [tier, setTier] = useState<string>(asset.rights.planTierAtGeneration ?? '');
  const [published, setPublished] = useState<string>(asset.rights.publishedToCommunity ?? '');
  const [attested, setAttested] = useState<string>(asset.rights.thirdPartyMaterialAttested ?? '');
  const [disclosure, setDisclosure] = useState<string>(asset.rights.disclosurePosture ?? '');

  const complete = [tier, published, attested, disclosure].every(Boolean);

  function save() {
    if (!complete) return;
    update.mutate(
      {
        assetId: asset.id,
        planTier: tier as PlanTier,
        publishedToCommunity: published as RightsPredicate,
        thirdPartyMaterialAttested: attested as RightsPredicate,
        disclosurePosture: disclosure as RightsPredicate,
      },
      {
        onSuccess: () => toast.success('Rights recorded'),
        onError: () => toast.error('Could not record the rights position'),
      },
    );
  }

  const field = (
    id: string,
    label: string,
    options: readonly string[],
    value: string,
    onChange: (next: string) => void,
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>
          Not recorded
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <Label>Rights position</Label>
        <p className="text-sm text-text-secondary" data-testid="rights-summary">
          {rightsSummary(asset.rights)}
        </p>
        <p className="text-xs text-text-secondary">
          Recorded by you, not verified against the provider terms.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field('rights-tier', 'Plan tier at generation', TIERS, tier, setTier)}
        {field('rights-published', 'Published to Community', PREDICATES, published, setPublished)}
        {field(
          'rights-attested',
          'Third-party material attested clear',
          PREDICATES,
          attested,
          setAttested,
        )}
        {field(
          'rights-disclosure',
          'Depicts a real person or event',
          PREDICATES,
          disclosure,
          setDisclosure,
        )}
      </div>

      <Button onClick={save} disabled={!complete || update.isPending}>
        {update.isPending ? 'Saving…' : 'Record rights position'}
      </Button>
    </div>
  );
}
