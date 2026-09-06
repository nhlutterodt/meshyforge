// src/components/generate/creativeLab/creativeLabConfig.ts
// Shared, framework-agnostic constants for the Creative Lab panel.
// Source: FRD FR-CLAB-01–07

import type { CreativeLabOutputFormat, CreativeLabProductType, TaskType } from '@lib/meshy-types';

export interface CreativeLabProductConfig {
  readonly value: CreativeLabProductType;
  readonly label: string;
  /** 'badge' = Keychain/Fridge Magnet (14 build options), 'figure' =
   * Figure/Vinyl Figure/Brick Figure (no build options), 'lamp', 'keycap'. */
  readonly family: 'badge' | 'figure' | 'lamp' | 'keycap';
  readonly prototypeCredits: number;
  readonly buildCredits: number;
  readonly outputFormats: readonly CreativeLabOutputFormat[];
}

export const CREATIVE_LAB_PRODUCTS: readonly CreativeLabProductConfig[] = [
  {
    value: 'keychain',
    label: 'Keychain',
    family: 'badge',
    prototypeCredits: 6,
    buildCredits: 30,
    outputFormats: ['glb', 'obj', 'zip'],
  },
  {
    value: 'fridge-magnet',
    label: 'Fridge Magnet',
    family: 'badge',
    prototypeCredits: 6,
    buildCredits: 30,
    outputFormats: ['glb', 'obj', 'zip'],
  },
  {
    value: 'figure',
    label: 'Figure',
    family: 'figure',
    prototypeCredits: 6,
    buildCredits: 30,
    outputFormats: [],
  },
  {
    value: 'vinyl-figure',
    label: 'Vinyl Figure',
    family: 'figure',
    prototypeCredits: 6,
    buildCredits: 30,
    outputFormats: [],
  },
  {
    value: 'brick-figure',
    label: 'Brick Figure',
    family: 'figure',
    prototypeCredits: 6,
    buildCredits: 30,
    outputFormats: [],
  },
  {
    value: 'lamp',
    label: 'Lamp',
    family: 'lamp',
    prototypeCredits: 6,
    buildCredits: 30,
    outputFormats: ['stl', 'zip'],
  },
  {
    value: 'keycap',
    label: 'Keycap',
    family: 'keycap',
    prototypeCredits: 12,
    buildCredits: 50,
    outputFormats: [],
  },
] as const;

/** Fridge Magnet's badge-option defaults differ from Keychain's per
 * FR-CLAB-02-F2 (badge_shape: rounded-rect, size_mm: 60, relief_height_mm:
 * 3.3, base_thickness_mm: 2.0). Keychain has no product-specific defaults
 * beyond the shared per-field defaults rendered by the options form. */
export const FRIDGE_MAGNET_DEFAULTS = {
  badgeShape: 'rounded-rect' as const,
  sizeMm: 60,
  reliefHeightMm: 3.3,
  baseThicknessMm: 2.0,
};

const FALLBACK_PRODUCT: CreativeLabProductConfig = {
  value: 'keychain',
  label: 'Keychain',
  family: 'badge',
  prototypeCredits: 6,
  buildCredits: 30,
  outputFormats: ['glb', 'obj', 'zip'],
};

export function findCreativeLabProduct(product: CreativeLabProductType): CreativeLabProductConfig {
  const found = CREATIVE_LAB_PRODUCTS.find((p) => p.value === product);
  // CREATIVE_LAB_PRODUCTS covers every CreativeLabProductType member, so this
  // is unreachable — the fallback only satisfies the type checker.
  return found ?? FALLBACK_PRODUCT;
}

/** Build the real backend TaskType wire value for a product + stage, e.g.
 * ('fridge-magnet', 'build') -> 'creative-lab-fridge-magnet-build'. */
export function creativeLabTaskType(
  product: CreativeLabProductType,
  stage: 'prototype' | 'build',
): TaskType {
  return `creative-lab-${product}-${stage}` as TaskType;
}
