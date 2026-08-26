// src/components/generate/MultiImagePanel.tsx
// Source: FRD FR-GEN-04, CSD §5
//
// Full parameter surface for Multi-Image to 3D generation.
// Exposes all 22 API parameters including AI model, texturing controls,
// remesh, pose mode, target formats, auto-size, and multi-view thumbnails.

import { ModelSelector } from '@components/common/ModelSelector';
import { MultiImageUpload } from '@components/common/MultiImageUpload';
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
import { Textarea } from '@components/ui/textarea';
import { useCreateMultiImageTo3D } from '@hooks/useMeshyApi';
import type { ExportFormat, ModelId, MultiImageTo3DRequest } from '@lib/meshy-types';
import { useSettingsStore } from '@stores/settingsStore';
import { useState } from 'react';
import { toast } from 'sonner';

const TEXTURE_RESOLUTIONS = [
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
  { value: '8k', label: '8K' },
] as const;

const TOPOLOGIES = [
  { value: 'triangle', label: 'Triangle' },
  { value: 'quad', label: 'Quad' },
] as const;

const POSE_MODES = [
  { value: '', label: 'None' },
  { value: 'a-pose', label: 'A-Pose' },
  { value: 't-pose', label: 'T-Pose' },
] as const;

const DECIMATION_MODES = [
  { value: '1', label: 'Ultra' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Medium' },
  { value: '4', label: 'Low' },
] as const;

const ORIGIN_OPTIONS = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'center', label: 'Center' },
] as const;

const ALL_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'glb', label: 'GLB' },
  { value: 'fbx', label: 'FBX' },
  { value: 'obj', label: 'OBJ' },
  { value: 'stl', label: 'STL' },
  { value: 'usdz', label: 'USDZ' },
  { value: '3mf', label: '3MF' },
];

export function MultiImagePanel() {
  const defaultAiModel = useSettingsStore((s) => s.defaultAiModel);
  const defaultTextureResolution = useSettingsStore((s) => s.defaultTextureResolution);
  const defaultShouldRemesh = useSettingsStore((s) => s.defaultShouldRemesh);
  const defaultTargetPolycount = useSettingsStore((s) => s.defaultTargetPolycount);
  const defaultTargetFormats = useSettingsStore((s) => s.defaultTargetFormats);
  const defaultEnablePbr = useSettingsStore((s) => s.defaultEnablePbr);
  const defaultRemoveLighting = useSettingsStore((s) => s.defaultRemoveLighting);
  const defaultPoseMode = useSettingsStore((s) => s.defaultPoseMode);

  const mutation = useCreateMultiImageTo3D();

  // ── Image input ──────────────────────────────────────────
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [inputTaskId, setInputTaskId] = useState('');

  // ── Generation params ────────────────────────────────────
  const [aiModel, setAiModel] = useState<ModelId>(defaultAiModel);
  const [shouldTexture, setShouldTexture] = useState(true);
  const [enablePbr, setEnablePbr] = useState(defaultEnablePbr);
  const [textureResolution, setTextureResolution] = useState<'2k' | '4k' | '8k'>(
    defaultTextureResolution,
  );
  const [texturePrompt, setTexturePrompt] = useState('');
  const [textureImageUrl, setTextureImageUrl] = useState('');

  // ── Remesh params ───────────────────────────────────────
  const [shouldRemesh, setShouldRemesh] = useState(defaultShouldRemesh);
  const [topology, setTopology] = useState<'quad' | 'triangle'>('triangle');
  const [targetPolycount, setTargetPolycount] = useState(defaultTargetPolycount);
  const [decimationMode, setDecimationMode] = useState<1 | 2 | 3 | 4>(3);
  const [savePreRemeshedModel, setSavePreRemeshedModel] = useState(false);

  // ── Output params ───────────────────────────────────────
  const [poseMode, setPoseMode] = useState<'' | 'a-pose' | 't-pose'>(
    defaultPoseMode as '' | 'a-pose' | 't-pose',
  );
  const [imageEnhancement, setImageEnhancement] = useState(true);
  const [removeLighting, setRemoveLighting] = useState(defaultRemoveLighting);
  const [moderation, setModeration] = useState(false);
  const [targetFormats, setTargetFormats] = useState<ExportFormat[]>([
    ...defaultTargetFormats,
  ] as ExportFormat[]);
  const [autoSize, setAutoSize] = useState(false);
  const [originAt, setOriginAt] = useState<'bottom' | 'center'>('bottom');
  const [alphaThumbnail, setAlphaThumbnail] = useState(false);
  const [multiViewThumbnails, setMultiViewThumbnails] = useState(false);

  const hasImages = imageUrls.length > 0;
  const hasInputTaskId = inputTaskId.trim().length > 0;
  const canGenerate = hasImages || hasInputTaskId;

  function toggleFormat(format: ExportFormat) {
    setTargetFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );
  }

  function handleGenerate() {
    if (!canGenerate) {
      toast.error('Please add at least one image or enter an input task ID');
      return;
    }

    const body: MultiImageTo3DRequest = {
      aiModel,
      shouldTexture,
      shouldRemesh,
      poseMode,
      imageEnhancement,
      removeLighting,
      moderation,
      autoSize,
      alphaThumbnail,
      multiViewThumbnails,
    };

    if (hasImages) body.imageUrls = imageUrls;
    if (hasInputTaskId) body.inputTaskId = inputTaskId.trim();
    if (shouldTexture) {
      body.enablePbr = enablePbr;
      body.textureResolution = textureResolution;
      if (texturePrompt.trim()) body.texturePrompt = texturePrompt.trim();
      if (textureImageUrl.trim()) body.textureImageUrl = textureImageUrl.trim();
    }
    if (shouldRemesh) {
      body.topology = topology;
      body.targetPolycount = targetPolycount;
      body.decimationMode = decimationMode;
      body.savePreRemeshedModel = savePreRemeshedModel;
    }
    if (targetFormats.length > 0) body.targetFormats = targetFormats;
    if (autoSize) body.originAt = originAt;

    mutation.mutate(body, {
      onSuccess: () => {
        toast.success('Multi-image-to-3D task created');
        setImageUrls([]);
        setInputTaskId('');
      },
      onError: (err) => toast.error(err.message ?? 'Failed to create task'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Multi-Image to 3D</h2>
      <p className="text-sm text-text-muted">
        Upload 1–4 images of the same object from different angles to generate a 3D model.
      </p>

      {/* ── Image upload ────────────────────────────────────── */}
      <MultiImageUpload images={imageUrls} onImagesChange={setImageUrls} maxImages={4} />

      {/* ── Alternative: input task ID ─────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="input-task-id">Input Task ID (optional)</Label>
        <Input
          id="input-task-id"
          value={inputTaskId}
          onChange={(e) => setInputTaskId(e.target.value)}
          placeholder="Or use a completed image-generation task ID"
        />
        <p className="text-xs text-text-muted">
          Provide images above or a task ID — if both are given, the task ID takes priority.
        </p>
      </div>

      {/* ── AI Model ────────────────────────────────────────── */}
      <ModelSelector value={aiModel} onChange={setAiModel} />

      {/* ── Texture controls ────────────────────────────────── */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="should-texture">Generate Texture</Label>
          <Switch id="should-texture" checked={shouldTexture} onCheckedChange={setShouldTexture} />
        </div>
        {shouldTexture && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-pbr">Enable PBR Maps</Label>
              <Switch id="enable-pbr" checked={enablePbr} onCheckedChange={setEnablePbr} />
            </div>
            <div className="space-y-2">
              <Label>Texture Resolution</Label>
              <Select
                value={textureResolution}
                onValueChange={(v) => setTextureResolution((v ?? '2k') as '2k' | '4k' | '8k')}
              >
                <SelectTrigger className="w-full">
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
            <div className="space-y-2">
              <Label htmlFor="texture-prompt">Texture Prompt (optional)</Label>
              <Textarea
                id="texture-prompt"
                value={texturePrompt}
                onChange={(e) => setTexturePrompt(e.target.value)}
                placeholder="e.g., weathered leather with brass rivets"
                rows={2}
                maxLength={600}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="texture-image-url">Texture Image URL (optional)</Label>
              <Input
                id="texture-image-url"
                value={textureImageUrl}
                onChange={(e) => setTextureImageUrl(e.target.value)}
                placeholder="Image to guide texturing"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Remesh controls ─────────────────────────────────── */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="should-remesh">Remesh</Label>
          <Switch id="should-remesh" checked={shouldRemesh} onCheckedChange={setShouldRemesh} />
        </div>
        {shouldRemesh && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topology</Label>
              <Select
                value={topology}
                onValueChange={(v) => setTopology((v ?? 'triangle') as 'quad' | 'triangle')}
              >
                <SelectTrigger className="w-full">
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
              <Label>Target Polycount: {targetPolycount.toLocaleString()}</Label>
              <Slider
                min={100}
                max={300000}
                step={1000}
                value={[targetPolycount]}
                onValueChange={(v) => {
                  if (Array.isArray(v) && v.length > 0) setTargetPolycount(v[0] ?? 30000);
                  else if (typeof v === 'number') setTargetPolycount(v);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Decimation Mode</Label>
              <Select
                value={String(decimationMode)}
                onValueChange={(v) => setDecimationMode(Number(v ?? 3) as 1 | 2 | 3 | 4)}
              >
                <SelectTrigger className="w-full">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="save-pre-remeshed">Save Pre-Remeshed Model</Label>
              <Switch
                id="save-pre-remeshed"
                checked={savePreRemeshedModel}
                onCheckedChange={setSavePreRemeshedModel}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Pose mode ────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Pose Mode</Label>
        <Select
          value={poseMode}
          onValueChange={(v) => setPoseMode((v ?? '') as '' | 'a-pose' | 't-pose')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSE_MODES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Toggles row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="image-enhancement">Image Enhancement</Label>
          <Switch
            id="image-enhancement"
            checked={imageEnhancement}
            onCheckedChange={setImageEnhancement}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="remove-lighting">Remove Lighting</Label>
          <Switch
            id="remove-lighting"
            checked={removeLighting}
            onCheckedChange={setRemoveLighting}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="moderation">Moderation</Label>
          <Switch id="moderation" checked={moderation} onCheckedChange={setModeration} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="alpha-thumbnail">Alpha Thumbnail</Label>
          <Switch
            id="alpha-thumbnail"
            checked={alphaThumbnail}
            onCheckedChange={setAlphaThumbnail}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="multi-view-thumbs">Multi-View Thumbnails</Label>
          <Switch
            id="multi-view-thumbs"
            checked={multiViewThumbnails}
            onCheckedChange={setMultiViewThumbnails}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-size">Auto-Size</Label>
          <Switch id="auto-size" checked={autoSize} onCheckedChange={setAutoSize} />
        </div>
      </div>

      {/* ── Origin (only when auto-size is on) ─────────────── */}
      {autoSize && (
        <div className="space-y-2">
          <Label>Origin At</Label>
          <Select
            value={originAt}
            onValueChange={(v) => setOriginAt((v ?? 'bottom') as 'bottom' | 'center')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIGIN_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Target formats ──────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Target Formats</legend>
        <div className="grid grid-cols-3 gap-2">
          {ALL_FORMATS.map((format) => (
            <span key={format.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={targetFormats.includes(format.value)}
                onCheckedChange={() => toggleFormat(format.value)}
              />
              {format.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          Leave unchecked to receive all formats except 3MF (API default).
        </p>
      </fieldset>

      {/* ── Generate button ──────────────────────────────────── */}
      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || !canGenerate}
        className="w-full"
      >
        {mutation.isPending ? 'Generating...' : 'Generate 3D Model'}
      </Button>
    </div>
  );
}
