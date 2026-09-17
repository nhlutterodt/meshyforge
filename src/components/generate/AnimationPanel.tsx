// src/components/generate/AnimationPanel.tsx
// Source: FRD FR-POST-07, CSD §5, ADR-0012 (motion lane)

import {
  AssetTaskPicker,
  isCompletedMotion,
  isCompletedRig,
} from '@components/common/AssetTaskPicker';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Skeleton } from '@components/ui/skeleton';
import { useAnimationLibrary } from '@hooks/useAnimationLibrary';
import { useAnimationPreview } from '@hooks/useAnimationPreview';
import { useCreateAnimation, useCreateTextToMotion } from '@hooks/useMeshyApi';
import type { AnimationLibraryItem, AnimationRequest, TextToMotionRequest } from '@lib/meshy-types';
import { assetUrl } from '@lib/tauri';
import { useState } from 'react';
import { toast } from 'sonner';

// FR-POST-07-F7: static credit-cost estimate from the FRD.
const ANIMATION_CREDIT_COST = 3;
// ADR-0012: text-to-motion mode costs.
const MOTION_PRIME_COST = 10;
const MOTION_SWIFT_COST = 3;
const FPS_OPTIONS = [24, 25, 30, 60] as const;
type PostProcessOp = '' | 'change_fps' | 'fbx2usdz' | 'extract_armature';
type Fps = (typeof FPS_OPTIONS)[number];

// Sub-modes of the Animate panel (ADR-0012).
type SubMode = 'preset' | 'custom-motion' | 'retarget' | 'merge';
const SUB_MODES: Array<{ value: SubMode; label: string }> = [
  { value: 'preset', label: 'Preset Action' },
  { value: 'custom-motion', label: 'Custom Motion (Text-to-Motion)' },
  { value: 'retarget', label: 'Retarget Motion onto Rig' },
  { value: 'merge', label: 'Merge Multiple Actions' },
];

// 2-10 seconds in 0.5 steps (ADR-0012).
const DURATION_OPTIONS = [
  2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
] as const;
type Duration = (typeof DURATION_OPTIONS)[number];

const MAX_MERGE_ACTIONS = 10;

function isPostProcessOp(value: string | null | undefined): value is PostProcessOp {
  return value === 'change_fps' || value === 'fbx2usdz' || value === 'extract_armature';
}

function isFps(value: number): value is Fps {
  return FPS_OPTIONS.some((option) => option === value);
}

function isDuration(value: number): value is Duration {
  return DURATION_OPTIONS.some((option) => option === value);
}

// ADR-0011: the locally cached file is the primary source; the provider CDN is
// only used until the cache resolves, or if caching fails outright.
function AnimationPreview({ item }: { readonly item: AnimationLibraryItem }) {
  const { data: cachedPath } = useAnimationPreview(item.key, item.previewUrl);
  const [cacheRenderFailed, setCacheRenderFailed] = useState(false);
  const [remoteRenderFailed, setRemoteRenderFailed] = useState(false);

  if (!item.previewUrl) {
    return <p className="text-xs text-text-muted">Selected: {item.name}</p>;
  }

  // Fallback ladder: local cache → provider CDN → placeholder. A cached file
  // that fails to render (deleted, truncated, mid-write) must still fall
  // through to the CDN rather than dead-ending on the placeholder.
  const servingFromCache = Boolean(cachedPath) && !cacheRenderFailed;
  const source = servingFromCache && cachedPath ? assetUrl(cachedPath) : item.previewUrl;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {remoteRenderFailed ? (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded bg-bg-tertiary text-center text-xs text-text-muted">
          No preview
        </div>
      ) : (
        <img
          key={source}
          src={source}
          alt={`Preview of ${item.name}`}
          className="h-24 w-24 shrink-0 rounded bg-bg-tertiary object-contain"
          onError={() =>
            servingFromCache ? setCacheRenderFailed(true) : setRemoteRenderFailed(true)
          }
        />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-xs text-text-muted">
          {item.category}
          {item.subCategory ? ` · ${item.subCategory}` : ''}
        </p>
        <p className="text-xs text-text-muted" data-testid="preview-source">
          {servingFromCache ? 'Cached locally' : 'Loading from provider'}
        </p>
      </div>
    </div>
  );
}

function MergeActionList({
  library,
  selected,
  onToggle,
}: {
  readonly library: AnimationLibraryItem[];
  readonly selected: number[];
  readonly onToggle: (id: number) => void;
}) {
  return (
    <Command label="Actions to Merge" className="rounded-lg border">
      <CommandInput placeholder="Search actions to merge..." />
      <CommandList>
        <CommandEmpty>No matching animations.</CommandEmpty>
        <CommandGroup>
          {library.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <CommandItem
                key={item.key}
                value={`${item.name} ${item.category} ${item.subCategory ?? ''}`}
                data-checked={isSelected}
                onSelect={() => onToggle(item.id)}
              >
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-text-muted">{isSelected ? '✓' : ''}</span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {item.category}
                </Badge>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function AnimationPanel() {
  const animationMutation = useCreateAnimation();
  const motionMutation = useCreateTextToMotion();
  const { data: library, isLoading } = useAnimationLibrary();

  const [subMode, setSubMode] = useState<SubMode>('preset');
  const [rigTaskId, setRigTaskId] = useState('');
  const [actionId, setActionId] = useState('');
  const [mergedActionIds, setMergedActionIds] = useState<number[]>([]);
  const [motionTaskId, setMotionTaskId] = useState('');
  const [motionPrompt, setMotionPrompt] = useState('');
  const [motionMode, setMotionMode] = useState<'prime' | 'swift'>('prime');
  const [duration, setDuration] = useState<Duration>(2.5);
  const [postProcessOp, setPostProcessOp] = useState<PostProcessOp>('');
  const [fps, setFps] = useState<Fps>(30);

  const selected = (library ?? []).find((item) => String(item.id) === actionId);

  function toggleMergeAction(id: number) {
    setMergedActionIds((current) => {
      if (current.includes(id)) return current.filter((existing) => existing !== id);
      if (current.length >= MAX_MERGE_ACTIONS) {
        toast.error(`Select at most ${MAX_MERGE_ACTIONS} actions`);
        return current;
      }
      return [...current, id];
    });
  }

  function handlePresetGenerate() {
    if (!rigTaskId.trim()) return toast.error('Rig task ID required');
    if (!actionId) return toast.error('Please select an animation action');
    const body: AnimationRequest = {
      rigTaskId: rigTaskId.trim(),
      actionId: Number(actionId),
      ...(postProcessOp
        ? {
            postProcess: {
              operationType: postProcessOp,
              ...(postProcessOp === 'change_fps' ? { fps } : {}),
            },
          }
        : {}),
    };
    animationMutation.mutate(body, {
      onSuccess: () => toast.success('Animation task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleCustomMotionGenerate() {
    if (!motionPrompt.trim()) return toast.error('Motion prompt required');
    const body: TextToMotionRequest = {
      prompt: motionPrompt.trim(),
      mode: motionMode,
      duration,
    };
    motionMutation.mutate(body, {
      onSuccess: () => toast.success('Text-to-motion task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleRetargetGenerate() {
    if (!rigTaskId.trim()) return toast.error('Rig task ID required');
    if (!motionTaskId.trim()) return toast.error('Motion task ID required');
    const body: AnimationRequest = {
      rigTaskId: rigTaskId.trim(),
      motionTaskId: motionTaskId.trim(),
    };
    animationMutation.mutate(body, {
      onSuccess: () => toast.success('Retarget task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleMergeGenerate() {
    if (!rigTaskId.trim()) return toast.error('Rig task ID required');
    if (mergedActionIds.length < 1) return toast.error('Select at least one action');
    const body: AnimationRequest = {
      rigTaskId: rigTaskId.trim(),
      actionIds: mergedActionIds,
    };
    animationMutation.mutate(body, {
      onSuccess: () => toast.success('Merge task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  const pending = animationMutation.isPending || motionMutation.isPending;

  let costText = 'Cost: 3 credits';
  if (subMode === 'custom-motion') {
    costText = `Cost: ${motionMode === 'prime' ? MOTION_PRIME_COST : MOTION_SWIFT_COST} credits`;
  } else if (subMode === 'merge') {
    costText = `Cost: ${mergedActionIds.length * ANIMATION_CREDIT_COST} credits`;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Animation</h2>

      <div className="space-y-2">
        <Label htmlFor="motion-mode">Mode</Label>
        <Select value={subMode} onValueChange={(v) => setSubMode(v as SubMode)}>
          <SelectTrigger id="motion-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUB_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subMode === 'preset' && (
        <>
          <AssetTaskPicker
            id="rig-task-id"
            label="Rig Task ID"
            value={rigTaskId}
            onChange={setRigTaskId}
            filter={isCompletedRig}
            placeholder="Task ID of the rigged model"
          />
          <div className="space-y-2">
            <Label>Animation Action</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Command label="Animation Action" className="rounded-lg border">
                <CommandInput placeholder="Search animations by name or category..." />
                <CommandList>
                  <CommandEmpty>No matching animations.</CommandEmpty>
                  <CommandGroup>
                    {(library ?? []).map((item) => (
                      <CommandItem
                        key={item.key}
                        value={`${item.name} ${item.category} ${item.subCategory ?? ''}`}
                        data-checked={String(item.id) === actionId}
                        onSelect={() => setActionId(String(item.id))}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {item.category}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
            {selected && <AnimationPreview key={selected.key} item={selected} />}
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-process-op">Post-Process (optional)</Label>
            <Select
              value={postProcessOp || 'none'}
              onValueChange={(v) => setPostProcessOp(isPostProcessOp(v) ? v : '')}
            >
              <SelectTrigger id="post-process-op" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="change_fps">Change FPS</SelectItem>
                <SelectItem value="fbx2usdz">Convert FBX to USDZ</SelectItem>
                <SelectItem value="extract_armature">Extract Armature</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {postProcessOp === 'change_fps' && (
            <div className="space-y-2">
              <Label htmlFor="post-process-fps">Target FPS</Label>
              <Select
                value={String(fps)}
                onValueChange={(v) => {
                  const parsed = Number(v);
                  if (isFps(parsed)) setFps(parsed);
                }}
              >
                <SelectTrigger id="post-process-fps" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FPS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {subMode === 'custom-motion' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="motion-prompt">Motion Prompt</Label>
            <Input
              id="motion-prompt"
              value={motionPrompt}
              onChange={(e) => setMotionPrompt(e.target.value)}
              placeholder="e.g. a slow martial-arts kata, arms sweeping"
            />
            <p className="text-xs text-text-muted">Max 400 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motion-quality">Quality</Label>
            <Select
              value={motionMode}
              onValueChange={(v) => setMotionMode(v === 'swift' ? 'swift' : 'prime')}
            >
              <SelectTrigger id="motion-quality" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prime">Prime (FBX, 10 credits)</SelectItem>
                <SelectItem value="swift">Swift (BVH, 3 credits)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motion-duration">Duration</Label>
            <Select
              value={String(duration)}
              onValueChange={(v) => {
                const parsed = Number(v);
                if (isDuration(parsed)) setDuration(parsed);
              }}
            >
              <SelectTrigger id="motion-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}s
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {subMode === 'retarget' && (
        <>
          <AssetTaskPicker
            id="rig-task-id"
            label="Rig Task ID"
            value={rigTaskId}
            onChange={setRigTaskId}
            filter={isCompletedRig}
            placeholder="Task ID of the rigged model"
          />
          <AssetTaskPicker
            id="motion-task-id"
            label="Motion Task ID"
            value={motionTaskId}
            onChange={setMotionTaskId}
            filter={isCompletedMotion}
            placeholder="Task ID of a completed text-to-motion clip"
          />
          <p className="text-xs text-text-muted">
            Requires a biped rig. Apply before the motion clip's 3-day retention expires.
          </p>
        </>
      )}

      {subMode === 'merge' && (
        <>
          <AssetTaskPicker
            id="rig-task-id"
            label="Rig Task ID"
            value={rigTaskId}
            onChange={setRigTaskId}
            filter={isCompletedRig}
            placeholder="Task ID of the rigged model"
          />
          <div className="space-y-2">
            <Label>Actions to Merge</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <MergeActionList
                library={library ?? []}
                selected={mergedActionIds}
                onToggle={toggleMergeAction}
              />
            )}
            <p className="text-xs text-text-muted">
              {mergedActionIds.length} / {MAX_MERGE_ACTIONS} selected. One file, one clip per
              action.
            </p>
          </div>
        </>
      )}

      <p className="text-sm text-text-muted">{costText}</p>
      <Button
        onClick={() => {
          if (subMode === 'preset') handlePresetGenerate();
          else if (subMode === 'custom-motion') handleCustomMotionGenerate();
          else if (subMode === 'retarget') handleRetargetGenerate();
          else handleMergeGenerate();
        }}
        disabled={
          pending ||
          (subMode === 'preset' && (!rigTaskId.trim() || !actionId)) ||
          (subMode === 'custom-motion' && !motionPrompt.trim()) ||
          (subMode === 'retarget' && (!rigTaskId.trim() || !motionTaskId.trim())) ||
          (subMode === 'merge' && (!rigTaskId.trim() || mergedActionIds.length === 0))
        }
        className="w-full"
      >
        {pending ? 'Generating...' : 'Generate Animation'}
      </Button>
    </div>
  );
}
