import type { PlanTier, RightsPredicate, RightsRecord } from '@lib/meshy-types';
// src/hooks/useUpdateAssetRights.ts
// ADR-0022: the capture path for the per-asset rights record.
import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchCachedAssets } from './assetQueryKeys';

export interface UpdateAssetRightsArgs {
  readonly assetId: string;
  readonly planTier: PlanTier;
  readonly publishedToCommunity: RightsPredicate;
  readonly thirdPartyMaterialAttested: RightsPredicate;
  readonly disclosurePosture: RightsPredicate;
}

export function useUpdateAssetRights() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      planTier,
      publishedToCommunity,
      thirdPartyMaterialAttested,
      disclosurePosture,
    }: UpdateAssetRightsArgs) => {
      // Passed as an object literal, not the interface itself: `invoke` takes
      // `Record<string, unknown>`, and an interface has no index signature.
      return await invoke<RightsRecord>('update_asset_rights', {
        assetId,
        planTier,
        publishedToCommunity,
        thirdPartyMaterialAttested,
        disclosurePosture,
      });
    },

    // The command returns the REFRESHED record, derived values included, so the
    // cache is patched with what Rust computed. Patching only the predicates
    // would leave a stale identifier on screen, and deriving it here would
    // duplicate the four-state rule in a second language (D-1).
    onSuccess: (rights, { assetId }) => {
      patchCachedAssets(qc, assetId, (asset) => ({ ...asset, rights }));
    },

    retry: 0,
  });
}
