// src/components/generate/PostProcessPanel.tsx
// Source: FRD FR-POST-01–05, CSD §5

import { AssetTaskPicker, hasDownloadedModel } from '@components/common/AssetTaskPicker';
import { Button } from '@components/ui/button';
import { Checkbox } from '@components/ui/checkbox';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Slider } from '@components/ui/slider';
import { Switch } from '@components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Textarea } from '@components/ui/textarea';
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
type RetextureStyleMode = 'text' | 'image' | 'multiview';

const ALL_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'glb', label: 'GLB' },
  { value: 'fbx', label: 'FBX' },
  { value: 'obj', label: 'OBJ' },
  { value: 'stl', label: 'STL' },
  { value: 'usdz', label: 'USDZ' },
  { value: '3mf', label: '3MF' },
];

const TOPOLOGIES = [
  { value: 'triangle', label: 'Triangle' },
  { value: 'quad', label: 'Quad' },
] as const;

const DECIMATION_MODES = [
  { value: '1', label: 'Ultra' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Medium' },
  { value: '4', label: 'Low' },
] as const;

const TEXTURE_RESOLUTIONS = [
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
  { value: '8k', label: '8K' },
] as const;

function toggleFormat(
  setFormats: React.Dispatch<React.SetStateAction<ExportFormat[]>>,
  format: ExportFormat,
) {
  setFormats((prev) =>
    prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
  );
}

export function PostProcessPanel() {
  const [inputTaskId, setInputTaskId] = useState('');

  // ── Remesh tab (FR-POST-01) ─────────────────────────────
  const [remeshTopology, setRemeshTopology] = useState<'quad' | 'triangle'>('triangle');
  const [remeshTargetPolycount, setRemeshTargetPolycount] = useState(30000);
  const [remeshDecimationMode, setRemeshDecimationMode] = useState<1 | 2 | 3 | 4>(3);
  const [remeshTargetFormats, setRemeshTargetFormats] = useState<ExportFormat[]>([]);
  const [remeshAlphaThumbnail, setRemeshAlphaThumbnail] = useState(false);

  // ── Retexture tab (FR-POST-02) ──────────────────────────
  const [retextureStyleMode, setRetextureStyleMode] = useState<RetextureStyleMode>('text');
  const [retextureTextStylePrompt, setRetextureTextStylePrompt] = useState('');
  const [retextureImageStyleUrl, setRetextureImageStyleUrl] = useState('');
  const [retextureMultiviewUrls, setRetextureMultiviewUrls] = useState('');
  const [retextureEnableOriginalUv, setRetextureEnableOriginalUv] = useState(false);
  const [retextureEnablePbr, setRetextureEnablePbr] = useState(false);
  const [retextureTextureResolution, setRetextureTextureResolution] = useState<'2k' | '4k' | '8k'>(
    '4k',
  );
  const [retextureRemoveLighting, setRetextureRemoveLighting] = useState(false);
  const [retextureTargetFormats, setRetextureTargetFormats] = useState<ExportFormat[]>([]);
  const [retextureAlphaThumbnail, setRetextureAlphaThumbnail] = useState(false);

  // ── Convert tab (FR-POST-03) ────────────────────────────
  const [convertTargetFormats, setConvertTargetFormats] = useState<ExportFormat[]>([]);

  // ── Resize tab (FR-POST-04) ──────────────────────────────
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
    const body: RemeshRequest = {
      inputTaskId: inputTaskId.trim(),
      topology: remeshTopology,
      targetPolycount: remeshTargetPolycount,
      decimationMode: remeshDecimationMode,
      alphaThumbnail: remeshAlphaThumbnail,
      ...(remeshTargetFormats.length > 0 ? { targetFormats: remeshTargetFormats } : {}),
    };
    remeshMutation.mutate(body, {
      onSuccess: () => toast.success('Remesh task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleRetexture() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');

    const textStylePrompt = retextureTextStylePrompt.trim();
    const imageStyleUrl = retextureImageStyleUrl.trim();
    const multiviewImageUrls = retextureMultiviewUrls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    if (retextureStyleMode === 'text' && !textStylePrompt) {
      return toast.error('Enter a text style prompt');
    }
    if (retextureStyleMode === 'image' && !imageStyleUrl) {
      return toast.error('Enter an image style URL');
    }
    if (retextureStyleMode === 'multiview' && multiviewImageUrls.length === 0) {
      return toast.error('Enter at least one multi-view image URL');
    }

    const body: RetextureRequest = {
      inputTaskId: inputTaskId.trim(),
      enableOriginalUv: retextureEnableOriginalUv,
      enablePbr: retextureEnablePbr,
      textureResolution: retextureTextureResolution,
      removeLighting: retextureRemoveLighting,
      alphaThumbnail: retextureAlphaThumbnail,
      ...(retextureStyleMode === 'text' ? { textStylePrompt } : {}),
      ...(retextureStyleMode === 'image' ? { imageStyleUrl } : {}),
      ...(retextureStyleMode === 'multiview' ? { multiviewImageUrls } : {}),
      ...(retextureTargetFormats.length > 0 ? { targetFormats: retextureTargetFormats } : {}),
    };
    retextureMutation.mutate(body, {
      onSuccess: () => toast.success('Retexture task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleConvert() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    if (convertTargetFormats.length === 0) {
      return toast.error('Select at least one target format');
    }
    const body: ConvertRequest = {
      inputTaskId: inputTaskId.trim(),
      targetFormats: convertTargetFormats,
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

  const retextureCreditCost =
    retextureTextureResolution === '8k' ? '15 credits (8k)' : '10 credits (2k/4k)';

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
        <TabsContent value="remesh" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="remesh-topology">Topology</Label>
            <Select
              value={remeshTopology}
              onValueChange={(v) => setRemeshTopology((v ?? 'triangle') as 'quad' | 'triangle')}
            >
              <SelectTrigger id="remesh-topology" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPOLOGIES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target Polycount: {remeshTargetPolycount.toLocaleString()}</Label>
            <Slider
              min={100}
              max={300000}
              step={1000}
              value={[remeshTargetPolycount]}
              onValueChange={(v) => {
                if (Array.isArray(v) && v.length > 0) setRemeshTargetPolycount(v[0] ?? 30000);
                else if (typeof v === 'number') setRemeshTargetPolycount(v);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remesh-decimation">Decimation Mode</Label>
            <Select
              value={String(remeshDecimationMode)}
              onValueChange={(v) => setRemeshDecimationMode(Number(v ?? 3) as 1 | 2 | 3 | 4)}
            >
              <SelectTrigger id="remesh-decimation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECIMATION_MODES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Target Formats</legend>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FORMATS.map((format) => (
                <span key={format.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    aria-label={format.label}
                    checked={remeshTargetFormats.includes(format.value)}
                    onCheckedChange={() => toggleFormat(setRemeshTargetFormats, format.value)}
                  />
                  {format.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              Leave unchecked to receive all formats except 3MF (API default).
            </p>
          </fieldset>
          <div className="flex items-center justify-between">
            <Label htmlFor="remesh-alpha-thumbnail">Alpha Thumbnail</Label>
            <Switch
              id="remesh-alpha-thumbnail"
              checked={remeshAlphaThumbnail}
              onCheckedChange={setRemeshAlphaThumbnail}
            />
          </div>
          <p className="text-xs text-text-muted">Cost: 5 credits</p>
          <Button onClick={handleRemesh} disabled={remeshMutation.isPending} className="w-full">
            Remesh Model
          </Button>
        </TabsContent>
        <TabsContent value="retexture" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retexture-style-mode">Style Input</Label>
            <Select
              value={retextureStyleMode}
              onValueChange={(v) => setRetextureStyleMode((v ?? 'text') as RetextureStyleMode)}
            >
              <SelectTrigger id="retexture-style-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Style Prompt</SelectItem>
                <SelectItem value="image">Image Style URL</SelectItem>
                <SelectItem value="multiview">Multi-View Image URLs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {retextureStyleMode === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="retexture-text-prompt">Text Style Prompt</Label>
              <Textarea
                id="retexture-text-prompt"
                value={retextureTextStylePrompt}
                onChange={(e) => setRetextureTextStylePrompt(e.target.value)}
                placeholder="e.g. weathered bronze with green patina"
                rows={2}
              />
            </div>
          )}
          {retextureStyleMode === 'image' && (
            <div className="space-y-2">
              <Label htmlFor="retexture-image-url">Image Style URL</Label>
              <Input
                id="retexture-image-url"
                value={retextureImageStyleUrl}
                onChange={(e) => setRetextureImageStyleUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}
          {retextureStyleMode === 'multiview' && (
            <div className="space-y-2">
              <Label htmlFor="retexture-multiview-urls">Multi-View Image URLs (one per line)</Label>
              <Textarea
                id="retexture-multiview-urls"
                value={retextureMultiviewUrls}
                onChange={(e) => setRetextureMultiviewUrls(e.target.value)}
                placeholder={'https://...\nhttps://...'}
                rows={3}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="retexture-original-uv">Enable Original UV</Label>
            <Switch
              id="retexture-original-uv"
              checked={retextureEnableOriginalUv}
              onCheckedChange={setRetextureEnableOriginalUv}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="retexture-pbr">Enable PBR Maps</Label>
            <Switch
              id="retexture-pbr"
              checked={retextureEnablePbr}
              onCheckedChange={setRetextureEnablePbr}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retexture-resolution">Texture Resolution</Label>
            <Select
              value={retextureTextureResolution}
              onValueChange={(v) =>
                setRetextureTextureResolution((v ?? '4k') as '2k' | '4k' | '8k')
              }
            >
              <SelectTrigger id="retexture-resolution" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXTURE_RESOLUTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="retexture-remove-lighting">Remove Lighting</Label>
            <Switch
              id="retexture-remove-lighting"
              checked={retextureRemoveLighting}
              onCheckedChange={setRetextureRemoveLighting}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Target Formats</legend>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FORMATS.map((format) => (
                <span key={format.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    aria-label={format.label}
                    checked={retextureTargetFormats.includes(format.value)}
                    onCheckedChange={() => toggleFormat(setRetextureTargetFormats, format.value)}
                  />
                  {format.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              Leave unchecked to receive all formats except 3MF (API default).
            </p>
          </fieldset>
          <div className="flex items-center justify-between">
            <Label htmlFor="retexture-alpha-thumbnail">Alpha Thumbnail</Label>
            <Switch
              id="retexture-alpha-thumbnail"
              checked={retextureAlphaThumbnail}
              onCheckedChange={setRetextureAlphaThumbnail}
            />
          </div>
          <p className="text-xs text-text-muted">Cost: {retextureCreditCost}</p>
          <Button
            onClick={handleRetexture}
            disabled={retextureMutation.isPending}
            className="w-full"
          >
            Retexture Model
          </Button>
        </TabsContent>
        <TabsContent value="convert" className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Target Formats</legend>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FORMATS.map((format) => (
                <span key={format.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    aria-label={format.label}
                    checked={convertTargetFormats.includes(format.value)}
                    onCheckedChange={() => toggleFormat(setConvertTargetFormats, format.value)}
                  />
                  {format.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-text-muted">Select at least one format to convert to.</p>
          </fieldset>
          <Button
            onClick={handleConvert}
            disabled={convertMutation.isPending || convertTargetFormats.length === 0}
            className="w-full"
          >
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
