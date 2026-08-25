// src/components/gallery/AssetGrid.tsx
// Source: FRD FR-GAL-01/06, CSD §5

import { AssetCard } from '@components/gallery/AssetCard';
import { ScrollArea } from '@components/ui/scroll-area';
import { Skeleton } from '@components/ui/skeleton';
import { useAssets } from '@hooks/useAssets';

interface AssetGridProps {
  readonly searchQuery: string;
  readonly activeTag: string | null;
  readonly onSelectAsset: (assetId: string) => void;
}

export function AssetGrid({ searchQuery, activeTag, onSelectAsset }: AssetGridProps) {
  const { data: assets, isLoading, isError } = useAssets(searchQuery, activeTag);

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

  if (!assets || assets.length === 0) {
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
    </ScrollArea>
  );
}
