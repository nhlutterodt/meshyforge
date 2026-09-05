// src/components/generate/PostProcessPanel.tsx
// Source: FRD FR-POST-01–05, CSD §5

import { AssetTaskPicker, hasDownloadedModel } from '@components/common/AssetTaskPicker';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
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

type ResizeMode = 'height' | 'longestSide' | 'auto';

export function PostProcessPanel() {
  const [inputTaskId, setInputTaskId] = useState('');
  const [resizeMode, setResizeMode] = useState<ResizeMode>('height');
  const [resizeValue, setResizeValue] = useState('');
  const [resizeOriginAt, setResizeOriginAt] = useState<'bottom' | 'center'>('bottom');
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
    if (resizeMode !== 'auto' && !resizeValue.trim()) {
      return toast.error('Enter a size value in meters');
    }
    const body: ResizeRequest = {
      inputTaskId: inputTaskId.trim(),
      originAt: resizeOriginAt,
      ...(resizeMode === 'height' ? { resizeHeight: Number(resizeValue) } : {}),
      ...(resizeMode === 'longestSide' ? { resizeLongestSide: Number(resizeValue) } : {}),
      ...(resizeMode === 'auto' ? { autoSize: true } : {}),
    };
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
      <AssetTaskPicker
        id="input-task-id"
        label="Input Task ID"
        value={inputTaskId}
        onChange={setInputTaskId}
        filter={hasDownloadedModel}
        placeholder="e.g. task-abc-123"
      />
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
        <TabsContent value="resize" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resize-mode">Resize Mode</Label>
            <Select
              value={resizeMode}
              onValueChange={(v) => setResizeMode((v ?? 'height') as ResizeMode)}
            >
              <SelectTrigger id="resize-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="height">Specific height (m)</SelectItem>
                <SelectItem value="longestSide">Longest side (m)</SelectItem>
                <SelectItem value="auto">Auto (AI-estimated)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {resizeMode !== 'auto' && (
            <div className="space-y-2">
              <Label htmlFor="resize-value">
                {resizeMode === 'height' ? 'Height (meters)' : 'Longest side (meters)'}
              </Label>
              <Input
                id="resize-value"
                type="number"
                step="0.01"
                min="0"
                value={resizeValue}
                onChange={(e) => setResizeValue(e.target.value)}
                placeholder="e.g. 1.8"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="resize-origin">Origin</Label>
            <Select
              value={resizeOriginAt}
              onValueChange={(v) => setResizeOriginAt((v ?? 'bottom') as 'bottom' | 'center')}
            >
              <SelectTrigger id="resize-origin" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="center">Center</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
