// src/components/generate/PostProcessPanel.tsx
// Source: FRD FR-POST-01–05, CSD §5

import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
  useCreateConvert,
  useCreateRemesh,
  useCreateResize,
  useCreateRetexture,
  useCreateUvUnwrap,
} from '@hooks/useMeshyApi';
import type {
  ConvertRequest,
  ExportFormat,
  RemeshRequest,
  ResizeRequest,
  RetextureRequest,
  UvUnwrapRequest,
} from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

export function PostProcessPanel() {
  const [inputTaskId, setInputTaskId] = useState('');
  const remeshMutation = useCreateRemesh();
  const retextureMutation = useCreateRetexture();
  const convertMutation = useCreateConvert();
  const resizeMutation = useCreateResize();
  const uvUnwrapMutation = useCreateUvUnwrap();

  function handleRemesh() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    const body: RemeshRequest = { inputTaskId: inputTaskId.trim() };
    remeshMutation.mutate(body, {
      onSuccess: () => toast.success('Remesh task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleRetexture() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    const body: RetextureRequest = { inputTaskId: inputTaskId.trim() };
    retextureMutation.mutate(body, {
      onSuccess: () => toast.success('Retexture task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleConvert() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    const body: ConvertRequest = {
      inputTaskId: inputTaskId.trim(),
      targetFormats: ['glb', 'fbx'] as ExportFormat[],
    };
    convertMutation.mutate(body, {
      onSuccess: () => toast.success('Convert task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleResize() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    const body: ResizeRequest = { inputTaskId: inputTaskId.trim() };
    resizeMutation.mutate(body, {
      onSuccess: () => toast.success('Resize task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleUvUnwrap() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    const body: UvUnwrapRequest = { inputTaskId: inputTaskId.trim() };
    uvUnwrapMutation.mutate(body, {
      onSuccess: () => toast.success('UV unwrap task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Post-Processing</h2>
      <div className="space-y-2">
        <Label htmlFor="input-task-id">Input Task ID</Label>
        <Input
          id="input-task-id"
          value={inputTaskId}
          onChange={(e) => setInputTaskId(e.target.value)}
          placeholder="e.g. task-abc-123"
        />
      </div>
      <Tabs defaultValue="remesh">
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="remesh">Remesh</TabsTrigger>
          <TabsTrigger value="retexture">Retexture</TabsTrigger>
          <TabsTrigger value="convert">Convert</TabsTrigger>
          <TabsTrigger value="resize">Resize</TabsTrigger>
          <TabsTrigger value="uv">UV Unwrap</TabsTrigger>
        </TabsList>
        <TabsContent value="remesh">
          <Button onClick={handleRemesh} disabled={remeshMutation.isPending} className="w-full">
            Remesh Model
          </Button>
        </TabsContent>
        <TabsContent value="retexture">
          <Button
            onClick={handleRetexture}
            disabled={retextureMutation.isPending}
            className="w-full"
          >
            Retexture Model
          </Button>
        </TabsContent>
        <TabsContent value="convert">
          <Button onClick={handleConvert} disabled={convertMutation.isPending} className="w-full">
            Convert Model
          </Button>
        </TabsContent>
        <TabsContent value="resize">
          <Button onClick={handleResize} disabled={resizeMutation.isPending} className="w-full">
            Resize Model
          </Button>
        </TabsContent>
        <TabsContent value="uv">
          <Button onClick={handleUvUnwrap} disabled={uvUnwrapMutation.isPending} className="w-full">
            UV Unwrap Model
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
