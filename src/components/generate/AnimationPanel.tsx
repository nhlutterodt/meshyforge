// src/components/generate/AnimationPanel.tsx
// Source: FRD FR-POST-07, CSD §5

import { AssetTaskPicker, isCompletedRig } from '@components/common/AssetTaskPicker';
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
import { useCreateAnimation } from '@hooks/useMeshyApi';
import type { AnimationRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

// FR-POST-07-F7: static credit-cost estimate from the FRD.
const ANIMATION_CREDIT_COST = 3;
const FPS_OPTIONS = [24, 25, 30, 60] as const;
type PostProcessOp = '' | 'change_fps' | 'fbx2usdz' | 'extract_armature';
type Fps = (typeof FPS_OPTIONS)[number];

function isPostProcessOp(value: string | null | undefined): value is PostProcessOp {
  return value === 'change_fps' || value === 'fbx2usdz' || value === 'extract_armature';
}

function isFps(value: number): value is Fps {
  return FPS_OPTIONS.some((option) => option === value);
}

export function AnimationPanel() {
  const mutation = useCreateAnimation();
  const { data: library, isLoading } = useAnimationLibrary();
  const [rigTaskId, setRigTaskId] = useState('');
  const [actionId, setActionId] = useState('');
  const [postProcessOp, setPostProcessOp] = useState<PostProcessOp>('');
  const [fps, setFps] = useState<Fps>(30);

  const selected = (library ?? []).find((item) => String(item.id) === actionId);

  function handleGenerate() {
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
    mutation.mutate(body, {
      onSuccess: () => toast.success('Animation task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Animation</h2>
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
          // `label` gives the underlying cmdk input its accessible name
          // (FR-POST-07-F3: searchable list) — cmdk renders it as a visually
          // hidden <label> wired via aria-labelledby, not the visible
          // caption above, which is why that caption has no htmlFor.
          <Command label="Animation Action" className="rounded-lg border">
            <CommandInput placeholder="Search animations by name or category..." />
            <CommandList>
              <CommandEmpty>No matching animations.</CommandEmpty>
              <CommandGroup>
                {(library ?? []).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.category}`}
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
        {selected && <p className="text-xs text-text-muted">Selected: {selected.name}</p>}
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
      <p className="text-sm text-text-muted">Cost: {ANIMATION_CREDIT_COST} credits</p>
      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || !rigTaskId.trim() || !actionId}
        className="w-full"
      >
        {mutation.isPending ? 'Generating...' : 'Generate Animation'}
      </Button>
    </div>
  );
}
