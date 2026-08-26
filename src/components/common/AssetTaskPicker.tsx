// src/components/common/AssetTaskPicker.tsx
// A visual, thumbnail-driven way to pick a task ID from previously generated
// assets, used anywhere a panel needs "the task ID of an existing model"
// (Rigging, Post-Process, Animation, Print). Replaces hand-typing a raw ID.
//
// Reuses the existing asset list (useAssets — the same data the Gallery
// already fetches) rather than adding a new backend query. A manual entry
// field is kept alongside the picker so an ID from outside local history
// (or in a test that doesn't seed the asset list) still works.

import { Badge } from '@components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@components/ui/command';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useAssets } from '@hooks/useAssets';
import type { AssetRow } from '@lib/meshy-types';
import { assetUrl } from '@lib/tauri';
import { Box } from 'lucide-react';

// An asset counts as "has a downloaded 3D model" once its file_paths map is
// non-empty — every successfully downloaded 3D-producing task populates at
// least a `glb` entry (see docs/LESSONS_LEARNED.md, "Local Persistence Is
// the Task History").
export function hasDownloadedModel(asset: AssetRow): boolean {
  if (asset.status !== 'SUCCEEDED') return false;
  try {
    const paths = JSON.parse(asset.filePaths) as Record<string, string>;
    return Object.keys(paths).length > 0;
  } catch {
    return false;
  }
}

// An asset is eligible as an Animation panel's rig-task-id input once it is
// itself a successfully completed rigging task — matching Meshy's own
// requirement ("id of a successfully completed rigging task").
export function isCompletedRig(asset: AssetRow): boolean {
  return asset.taskType === 'rig' && asset.status === 'SUCCEEDED';
}

interface AssetTaskPickerProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (taskId: string) => void;
  readonly filter: (asset: AssetRow) => boolean;
  readonly placeholder?: string;
}

export function AssetTaskPicker({
  id,
  label,
  value,
  onChange,
  filter,
  placeholder,
}: AssetTaskPickerProps) {
  const { data: assets } = useAssets();
  const eligible = (assets ?? []).filter(filter);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {eligible.length > 0 && (
        <Command className="rounded-lg border">
          <CommandInput placeholder="Search your assets by prompt, type, or ID..." />
          <CommandList>
            <CommandEmpty>No matching assets.</CommandEmpty>
            <CommandGroup>
              {eligible.map((asset) => (
                <CommandItem
                  key={asset.id}
                  value={`${asset.id} ${asset.prompt ?? ''} ${asset.taskType}`}
                  data-checked={asset.id === value}
                  onSelect={() => onChange(asset.id)}
                >
                  {asset.thumbnailPath ? (
                    <img
                      src={assetUrl(asset.thumbnailPath)}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-bg-tertiary">
                      <Box className="h-4 w-4 text-text-muted" />
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate">{asset.prompt ?? asset.taskType}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {asset.taskType}
                  </Badge>
                  <span className="shrink-0 truncate font-mono text-xs text-text-muted">
                    {asset.id.slice(0, 8)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Or paste a task ID'}
      />
    </div>
  );
}
