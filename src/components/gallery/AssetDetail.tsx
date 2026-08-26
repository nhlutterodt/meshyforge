// src/components/gallery/AssetDetail.tsx
// Source: FRD FR-GAL-10, CSD §5

import { ExportDialog } from '@components/export/ExportDialog';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Separator } from '@components/ui/separator';
import { Skeleton } from '@components/ui/skeleton';
import { Textarea } from '@components/ui/textarea';
import { useAssets } from '@hooks/useAssets';
import { useDeleteAsset } from '@hooks/useDeleteAsset';
import { useToggleFavorite } from '@hooks/useToggleFavorite';
import { useUpdateNotes } from '@hooks/useUpdateNotes';
import { useUpdateTags } from '@hooks/useUpdateTags';
import type { AssetRow } from '@lib/meshy-types';
import { formatRelativeTime } from '@lib/utils';
import { ArrowLeft, FolderOpen, Trash2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { Suspense, lazy, useState } from 'react';
import { toast } from 'sonner';

function PreviewLoadError(_props: { readonly asset: AssetRow }) {
  return (
    <div
      className="flex h-full items-center justify-center text-sm text-text-secondary"
      role="alert"
    >
      3D preview unavailable.
    </div>
  );
}

// Lazy-load 3D preview (code-splitting: three-vendor chunk)
const AssetPreview3D = lazy<ComponentType<{ readonly asset: AssetRow }>>(() =>
  import('@components/gallery/AssetPreview3D')
    .then((module) => ({ default: module.AssetPreview3D }))
    .catch(() => ({ default: PreviewLoadError })),
);

interface AssetDetailProps {
  readonly assetId: string;
  readonly onBack: () => void;
}

export function AssetDetail({ assetId, onBack }: AssetDetailProps) {
  const { data: assets } = useAssets();
  const asset = assets?.find((a) => a.id === assetId);

  const updateTags = useUpdateTags();
  const updateNotes = useUpdateNotes();
  const toggleFavorite = useToggleFavorite();
  const deleteAsset = useDeleteAsset();

  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const [isExportOpen, setIsExportOpen] = useState(false);

  if (!asset) {
    return <div className="py-12 text-center text-text-muted">Asset not found</div>;
  }

  const tags: string[] = (() => {
    try {
      return JSON.parse(asset.tags) as string[];
    } catch {
      return [];
    }
  })();

  function handleAddTag() {
    if (!tagInput.trim()) return;
    const newTags = [...tags, tagInput.trim()];
    updateTags.mutate(
      { assetId, tags: newTags },
      {
        onSuccess: () => toast.success('Tag added'),
        onError: () => toast.error('Failed to add tag'),
      },
    );
    setTagInput('');
  }

  function handleRemoveTag(tag: string) {
    const newTags = tags.filter((t) => t !== tag);
    updateTags.mutate({ assetId, tags: newTags });
  }

  function handleSaveNotes() {
    updateNotes.mutate(
      { assetId, notes },
      {
        onSuccess: () => toast.success('Notes saved'),
        onError: () => toast.error('Failed to save notes'),
      },
    );
  }

  function handleDelete() {
    deleteAsset.mutate(assetId, {
      onSuccess: () => {
        toast.success('Asset deleted');
        onBack();
      },
      onError: () => toast.error('Failed to delete asset'),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Gallery
      </Button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: 3D Preview */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">3D Preview</h3>
          <div className="aspect-square rounded-lg border border-border bg-bg-tertiary">
            <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
              <AssetPreview3D asset={asset} />
            </Suspense>
          </div>
        </div>

        {/* Right: Metadata + actions */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{asset.prompt ?? asset.taskType}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{asset.taskType}</Badge>
              <Badge variant="outline">{asset.status}</Badge>
              {asset.hasTextures && <Badge variant="outline">PBR</Badge>}
              {asset.hasRig && <Badge variant="outline">Rigged</Badge>}
              {asset.hasAnimation && <Badge variant="outline">Animated</Badge>}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-1 text-sm text-text-secondary">
            <div className="flex justify-between">
              <span>Created</span>
              <span>{formatRelativeTime(asset.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credits</span>
              <span>{asset.consumedCredits}</span>
            </div>
            {asset.aiModel && (
              <div className="flex justify-between">
                <span>Model</span>
                <span>{asset.aiModel}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this asset..."
              className="min-h-20"
            />
            <Button variant="ghost" size="sm" onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => toggleFavorite.mutate(assetId)}>
              {asset.favorite ? '★ Favorited' : '☆ Favorite'}
            </Button>
            <Button variant="secondary" onClick={() => setIsExportOpen(true)}>
              Export
            </Button>
            <Button variant="ghost">
              <FolderOpen className="mr-1 h-4 w-4" />
              Reveal
            </Button>
            <Button variant="ghost" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
