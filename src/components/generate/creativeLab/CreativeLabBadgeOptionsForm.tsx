// src/components/generate/creativeLab/CreativeLabBadgeOptionsForm.tsx
// Source: FRD FR-CLAB-01-F2 / FR-CLAB-02-F2 — the 14 badge-relief build
// options shared by Keychain and Fridge Magnet.

import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Switch } from '@components/ui/switch';
import type {
  CreativeLabBadgeOptions,
  CreativeLabOutputFormat,
  CreativeLabReliefCurve,
} from '@lib/meshy-types';

interface NumericFieldDef {
  readonly key: keyof CreativeLabBadgeOptions;
  readonly label: string;
  readonly step?: string;
}

const NUMERIC_FIELDS: readonly NumericFieldDef[] = [
  { key: 'sizeMm', label: 'Size (mm)' },
  { key: 'reliefHeightMm', label: 'Relief Height (mm)', step: '0.1' },
  { key: 'reliefOffsetMm', label: 'Relief Offset (mm)', step: '0.1' },
  { key: 'baseThicknessMm', label: 'Base Thickness (mm)', step: '0.1' },
  { key: 'curveParam', label: 'Curve Param', step: '0.1' },
  { key: 'smoothing', label: 'Smoothing', step: '0.1' },
  { key: 'reliefScale', label: 'Relief Scale', step: '0.1' },
  { key: 'depthThreshold', label: 'Depth Threshold', step: '0.1' },
  { key: 'exportResolution', label: 'Export Resolution' },
];

interface CreativeLabBadgeOptionsFormProps {
  readonly value: CreativeLabBadgeOptions;
  readonly onChange: (value: CreativeLabBadgeOptions) => void;
  readonly outputFormat: CreativeLabOutputFormat;
  readonly onOutputFormatChange: (value: CreativeLabOutputFormat) => void;
}

/** FR-CLAB-01-F2: 14 configurable fields — badge_shape, size_mm,
 * relief_height_mm, relief_offset_mm, base_thickness_mm, has_closed_back,
 * relief_curve, curve_param, invert_depth, smoothing, relief_scale,
 * depth_threshold, remove_background, export_resolution — plus the output
 * format selector (FR-CLAB-01-F3). */
export function CreativeLabBadgeOptionsForm({
  value,
  onChange,
  outputFormat,
  onOutputFormatChange,
}: CreativeLabBadgeOptionsFormProps) {
  function setField<K extends keyof CreativeLabBadgeOptions>(
    key: K,
    fieldValue: CreativeLabBadgeOptions[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cl-badge-shape">Badge Shape</Label>
        <Select
          value={value.badgeShape ?? 'circle'}
          onValueChange={(v) => setField('badgeShape', (v ?? 'circle') as never)}
        >
          <SelectTrigger id="cl-badge-shape" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="circle">Circle</SelectItem>
            <SelectItem value="rounded-rect">Rounded Rectangle</SelectItem>
            <SelectItem value="hexagon">Hexagon</SelectItem>
            <SelectItem value="shield">Shield</SelectItem>
            <SelectItem value="star">Star</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {NUMERIC_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`cl-badge-${field.key}`}>{field.label}</Label>
            <Input
              id={`cl-badge-${field.key}`}
              type="number"
              step={field.step ?? '1'}
              value={(value[field.key] as number | undefined) ?? ''}
              onChange={(e) =>
                setField(
                  field.key,
                  (e.target.value === '' ? undefined : Number(e.target.value)) as never,
                )
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cl-relief-curve">Relief Curve</Label>
        <Select
          value={value.reliefCurve ?? 'linear'}
          onValueChange={(v) => setField('reliefCurve', (v ?? 'linear') as CreativeLabReliefCurve)}
        >
          <SelectTrigger id="cl-relief-curve" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="gamma">Gamma</SelectItem>
            <SelectItem value="s-curve">S-Curve</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(
        [
          ['hasClosedBack', 'Closed Back'],
          ['invertDepth', 'Invert Depth'],
          ['removeBackground', 'Remove Background'],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={`cl-badge-${key}`}>{label}</Label>
          <Switch
            id={`cl-badge-${key}`}
            checked={Boolean(value[key])}
            onCheckedChange={(checked) => setField(key, checked)}
          />
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="cl-badge-output-format">Output Format</Label>
        <Select
          value={outputFormat}
          onValueChange={(v) => onOutputFormatChange((v ?? 'glb') as CreativeLabOutputFormat)}
        >
          <SelectTrigger id="cl-badge-output-format" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="glb">GLB</SelectItem>
            <SelectItem value="obj">OBJ (zip bundle)</SelectItem>
            <SelectItem value="zip">ZIP (all artifacts)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
