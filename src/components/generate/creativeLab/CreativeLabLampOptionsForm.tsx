// src/components/generate/creativeLab/CreativeLabLampOptionsForm.tsx
// Source: FRD FR-CLAB-06-F3 — the 10 Lamp geometry build options.

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
import type { CreativeLabLampOptions, CreativeLabOutputFormat } from '@lib/meshy-types';

interface NumericFieldDef {
  readonly key: keyof CreativeLabLampOptions;
  readonly label: string;
  readonly step?: string;
}

const NUMERIC_FIELDS: readonly NumericFieldDef[] = [
  { key: 'diameterMm', label: 'Diameter (mm)' },
  { key: 'thicknessMm', label: 'Thickness (mm)', step: '0.1' },
  { key: 'cutAmountPercent', label: 'Cut Amount (%)' },
  { key: 'fixtureOffsetXMm', label: 'Fixture Offset X (mm)', step: '0.1' },
  { key: 'fixtureOffsetZMm', label: 'Fixture Offset Z (mm)', step: '0.1' },
  { key: 'rotateXDeg', label: 'Rotate X (deg)' },
  { key: 'rotateYDeg', label: 'Rotate Y (deg)' },
  { key: 'rotateZDeg', label: 'Rotate Z (deg)' },
];

interface CreativeLabLampOptionsFormProps {
  readonly value: CreativeLabLampOptions;
  readonly onChange: (value: CreativeLabLampOptions) => void;
  readonly outputFormat: CreativeLabOutputFormat;
  readonly onOutputFormatChange: (value: CreativeLabOutputFormat) => void;
}

/** FR-CLAB-06-F3: 10 configurable fields — diameter_mm, thickness_mm,
 * cut_amount_percent, light_source_preset, fixture_offset_x_mm,
 * fixture_offset_z_mm, rotate_x_deg, rotate_y_deg, rotate_z_deg,
 * include_result_json — plus the output format selector. */
export function CreativeLabLampOptionsForm({
  value,
  onChange,
  outputFormat,
  onOutputFormatChange,
}: CreativeLabLampOptionsFormProps) {
  function setField<K extends keyof CreativeLabLampOptions>(
    key: K,
    fieldValue: CreativeLabLampOptions[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {NUMERIC_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`cl-lamp-${field.key}`}>{field.label}</Label>
            <Input
              id={`cl-lamp-${field.key}`}
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
        <Label htmlFor="cl-lamp-light-source">Light Source Preset</Label>
        <Select
          value={value.lightSourcePreset ?? 'bambu_mh001_60mm'}
          onValueChange={(v) =>
            setField('lightSourcePreset', (v ?? 'bambu_mh001_60mm') as 'bambu_mh001_60mm' | 'none')
          }
        >
          <SelectTrigger id="cl-lamp-light-source" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bambu_mh001_60mm">Bambu MH001 (60mm)</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="cl-lamp-include-json">Include Result JSON</Label>
        <Switch
          id="cl-lamp-include-json"
          checked={Boolean(value.includeResultJson)}
          onCheckedChange={(checked) => setField('includeResultJson', checked)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cl-lamp-output-format">Output Format</Label>
        <Select
          value={outputFormat}
          onValueChange={(v) => onOutputFormatChange((v ?? 'stl') as CreativeLabOutputFormat)}
        >
          <SelectTrigger id="cl-lamp-output-format" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stl">STL</SelectItem>
            <SelectItem value="zip">ZIP (lampshade + base disk)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
