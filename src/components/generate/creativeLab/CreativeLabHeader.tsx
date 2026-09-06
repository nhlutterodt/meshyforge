// src/components/generate/creativeLab/CreativeLabHeader.tsx
// Product-type selector, prototype/build stage toggle, and the per-stage
// credit cost line (FR-CLAB-0X-F4/F5 pattern: "Cost: N credits").

import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import type { CreativeLabProductType } from '@lib/meshy-types';
import { CREATIVE_LAB_PRODUCTS } from './creativeLabConfig';

interface CreativeLabHeaderProps {
  readonly product: CreativeLabProductType;
  readonly onProductChange: (product: CreativeLabProductType) => void;
  readonly stage: 'prototype' | 'build';
  readonly onStageChange: (stage: 'prototype' | 'build') => void;
  readonly credits: number;
}

export function CreativeLabHeader({
  product,
  onProductChange,
  stage,
  onStageChange,
  credits,
}: CreativeLabHeaderProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="cl-type">Project Type</Label>
        <Select value={product} onValueChange={(v) => onProductChange(v as CreativeLabProductType)}>
          <SelectTrigger id="cl-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREATIVE_LAB_PRODUCTS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Stage</Label>
        <div className="flex gap-2">
          <Button
            variant={stage === 'prototype' ? 'secondary' : 'ghost'}
            onClick={() => onStageChange('prototype')}
            className="flex-1"
          >
            Prototype
          </Button>
          <Button
            variant={stage === 'build' ? 'secondary' : 'ghost'}
            onClick={() => onStageChange('build')}
            className="flex-1"
          >
            Build
          </Button>
        </div>
      </div>
      <p className="text-sm text-text-muted">Cost: {credits} credits</p>
    </>
  );
}
