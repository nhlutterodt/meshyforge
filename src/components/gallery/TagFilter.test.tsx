// TagFilter.test.tsx — Covers TC-GAL-04-01 through TC-GAL-04-03
import { renderWithProviders } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

import { TagFilter } from '@components/gallery/TagFilter';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

describe('TagFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-GAL-04-01 — dropdown lists all tags with asset counts
  it('lists all tags in the dropdown when opened', async () => {
    const user = userEvent.setup();
    const tags = ['fantasy', 'creature', 'medieval'];

    const { getByRole, getAllByRole } = renderWithProviders(
      <TagFilter tags={tags} selectedTag={null} onTagChange={vi.fn()} />,
    );

    // Open the Select dropdown
    const trigger = getByRole('combobox');
    await user.click(trigger);

    // All tags plus "All tags" should appear as options
    const options = getAllByRole('option');
    const optionTexts = options.map((o) => o.textContent ?? '');

    expect(optionTexts).toContain('All tags');
    expect(optionTexts).toContain('fantasy');
    expect(optionTexts).toContain('creature');
    expect(optionTexts).toContain('medieval');
  });

  // TC-GAL-04-02 — selecting a tag filters gallery to matching assets
  it('calls onTagChange with the selected tag name', async () => {
    const user = userEvent.setup();
    const tags = ['fantasy', 'creature'];
    const onTagChange = vi.fn();

    const { getByRole, getAllByRole } = renderWithProviders(
      <TagFilter tags={tags} selectedTag={null} onTagChange={onTagChange} />,
    );

    const trigger = getByRole('combobox');
    await user.click(trigger);

    // Wait for the dropdown options to render
    let options: HTMLElement[] = [];
    await waitFor(() => {
      options = getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    const fantasyOption = options.find((o) => o.textContent === 'fantasy');
    expect(fantasyOption).toBeTruthy();

    await user.click(fantasyOption!);

    expect(onTagChange).toHaveBeenCalledWith('fantasy');
  });

  // TC-GAL-04-03 — selecting "All" clears the tag filter
  it('clears the tag filter by calling onTagChange with null when "All tags" is selected', async () => {
    const user = userEvent.setup();
    const tags = ['fantasy', 'creature'];
    const onTagChange = vi.fn();

    const { getByRole, getAllByRole } = renderWithProviders(
      <TagFilter tags={tags} selectedTag="fantasy" onTagChange={onTagChange} />,
    );

    const trigger = getByRole('combobox');
    await user.click(trigger);

    // Wait for the dropdown options to render
    let options: HTMLElement[] = [];
    await waitFor(() => {
      options = getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    const allOption = options.find((o) => o.textContent === 'All tags');
    expect(allOption).toBeTruthy();

    await user.click(allOption!);

    expect(onTagChange).toHaveBeenCalledWith(null);
  });
});