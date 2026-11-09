// src/components/gallery/AssetGrid.tsx
// Source: FRD FR-GAL-01/06, CSD §5, UI/UX DAT-01

import { AssetCard } from '@components/gallery/AssetCard';
import { Button } from '@components/ui/button';
import { ScrollArea } from '@components/ui/scroll-area';
import { Skeleton } from '@components/ui/skeleton';
import { useInfiniteAssets } from '@hooks/useAssets';
import { useMemo } from 'react';

interface AssetGridProps {
  readonly searchQuery: string;
  readonly activeTag: string | null;
  readonly onSelectAsset: (assetId: string) => void;
}

export function AssetGrid({ searchQuery, activeTag, onSelectAsset }: AssetGridProps) {
  // DAT-01: one page (50) at a time, with "Load More" for the next page.
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteAssets(searchQuery, activeTag);

  // Flattening is O(pages), not O(assets): it is a shallow concat of the
  // already-materialized page arrays, so it stays cheap as the gallery grows.
  // useMemo keeps the array reference stable across unrelated re-renders
  // (HOK-06 — this is a referential-equality memo, not a value computation).
  const pages = data?.pages;
  const assets = useMemo(() => pages?.flatMap((page) => page.assets) ?? [], [pages]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={`skeleton-${i + 1}`} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="py-12 text-center text-text-muted">Failed to load assets</div>;
  }

  if (assets.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted">
        {searchQuery || activeTag
          ? 'No assets match your filters'
          : 'No assets yet. Generate a model to get started.'}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onSelect={() => onSelectAsset(asset.id)} />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}
    </ScrollArea>
  );
}
