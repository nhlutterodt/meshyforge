// src/components/generate/AnimationPanel.tsx
// Source: FRD FR-POST-07, CSD §5

import { AssetTaskPicker, isCompletedRig } from '@components/common/AssetTaskPicker';
import { Button } from '@components/ui/button';
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

export function AnimationPanel() {
  const mutation = useCreateAnimation();
  const { data: library, isLoading } = useAnimationLibrary();
  const [rigTaskId, setRigTaskId] = useState('');
  const [actionId, setActionId] = useState('');

  function handleGenerate() {
    if (!rigTaskId.trim()) return toast.error('Rig task ID required');
    if (!actionId) return toast.error('Please select an animation action');
    const body: AnimationRequest = {
      rigTaskId: rigTaskId.trim(),
      actionId: Number(actionId),
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
        <Label htmlFor="action-select">Animation Action</Label>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={actionId} onValueChange={(v) => setActionId(v ?? '')}>
            <SelectTrigger id="action-select" className="w-full">
              <SelectValue placeholder="Select an action" />
            </SelectTrigger>
            <SelectContent>
              {(library ?? []).map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
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
