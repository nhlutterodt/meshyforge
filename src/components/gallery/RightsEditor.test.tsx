// RightsEditor.test.tsx — ADR-0022 / LM-01: the capture path, and the rule that
// the frontend renders the derived identifier without ever naming the vocabulary.
import { renderWithProviders } from '@/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightsEditor, rightsSummary } from '@components/gallery/RightsEditor';
import { type AssetRow, UNRECORDED_RIGHTS } from '@lib/meshy-types';

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@hooks/useUpdateAssetRights', () => ({
  useUpdateAssetRights: () => ({ mutate: mocks.mutate, isPending: false }),
}));

function makeAsset(rights: AssetRow['rights']): AssetRow {
  return {
    id: 'task-abc',
    rights,
    taskType: 'text-to-3d',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 5,
    filePaths: {},
    texturePaths: [],
    notes: '',
    tags: [],
    createdAt: 1,
    startedAt: 1,
    finishedAt: 1,
    downloadedAt: 1,
    hasTextures: false,
    hasRig: false,
    hasAnimation: false,
    favorite: false,
    lastViewedAt: 0,
  };
}

describe('rightsSummary', () => {
  it('spells out why an identifier is not established, without naming it', () => {
    const summary = rightsSummary(UNRECORDED_RIGHTS);

    expect(summary).toBe('Not established — plan tier not recorded');
    // The guardrail forbids the identifier vocabulary anywhere under src/
    // outside meshy-types.ts, so this asserts the CAVEAT replaced the identifier
    // rather than the copy repeating it.
    expect(summary).not.toBe(UNRECORDED_RIGHTS.identifier);
  });

  it('echoes whatever identifier Rust sent, without special-casing one', () => {
    // A neutral sentinel on purpose: the component must pass through whatever
    // the backend derived, so a regression that hardcodes a known identifier
    // (and thereby duplicates the vocabulary) fails here.
    expect(
      rightsSummary({ ...UNRECORDED_RIGHTS, identifier: 'IDENTIFIER-FROM-RUST', reason: null }),
    ).toBe('IDENTIFIER-FROM-RUST');
  });
});

describe('RightsEditor', () => {
  beforeEach(() => {
    mocks.mutate.mockClear();
  });

  it('cannot submit until every predicate has been chosen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RightsEditor asset={makeAsset(UNRECORDED_RIGHTS)} />);

    const save = screen.getByRole('button', { name: /record rights position/i });
    expect(save).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/plan tier/i), 'paid');
    await user.selectOptions(screen.getByLabelText(/published to community/i), 'no');
    await user.selectOptions(screen.getByLabelText(/third-party material/i), 'yes');
    expect(save).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/depicts a real person/i), 'unknown');
    expect(save).toBeEnabled();
  });

  it('sends the four enums the command validates', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RightsEditor asset={makeAsset(UNRECORDED_RIGHTS)} />);

    await user.selectOptions(screen.getByLabelText(/plan tier/i), 'paid');
    await user.selectOptions(screen.getByLabelText(/published to community/i), 'no');
    await user.selectOptions(screen.getByLabelText(/third-party material/i), 'yes');
    await user.selectOptions(screen.getByLabelText(/depicts a real person/i), 'unknown');
    await user.click(screen.getByRole('button', { name: /record rights position/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        assetId: 'task-abc',
        planTier: 'paid',
        publishedToCommunity: 'no',
        thirdPartyMaterialAttested: 'yes',
        disclosurePosture: 'unknown',
      },
      expect.anything(),
    );
  });
});
