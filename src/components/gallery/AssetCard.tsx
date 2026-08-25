// src/components/gallery/AssetCard.tsx
// Source: FRD FR-GAL-02, CSD §5

import { Badge } from '@components/ui/badge';
import { Card, CardContent } from '@components/ui/card';
import { useToggleFavorite } from '@hooks/useToggleFavorite';
import type { AssetRow } from '@lib/meshy-types';
import { assetUrl } from '@lib/tauri';
import { cn } from '@lib/utils';
import { formatRelativeTime } from '@lib/utils';
import { Box, Star } from 'lucide-react';

interface AssetCardProps {
  readonly asset: AssetRow;
  readonly onSelect: () => void;
}

export function AssetCard({ asset, onSelect }: AssetCardProps) {
  const toggleFavorite = useToggleFavorite();

  const tags: string[] = (() => {
    try {
      return JSON.parse(asset.tags) as string[];
    } catch {
      return [];
    }
  })();

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-colors hover:border-accent"
      onClick={onSelect}
      tabIndex={0}
      aria-label={`Asset: ${asset.prompt ?? asset.meshyType}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-bg-tertiary">
        {asset.thumbnailPath ? (
          <img
            src={assetUrl(asset.thumbnailPath)}
            alt={asset.prompt ?? asset.meshyType}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Box className="h-8 w-8 text-text-muted" />
          </div>
        )}
        {/* Favorite star */}
        <button
          type="button"
          className="absolute right-2 top-2"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite.mutate(asset.id);
          }}
          aria-label={asset.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={cn(
              'h-4 w-4',
              asset.favorite ? 'fill-warning text-warning' : 'text-text-muted',
            )}
          />
        </button>
      </div>

      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">{asset.prompt ?? asset.meshyType}</p>
        <div className="mt-1 flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {asset.status}
          </Badge>
          <span className="text-xs text-text-muted">{formatRelativeTime(asset.createdAt)}</span>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
