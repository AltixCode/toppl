/**
 * Block palettes.
 *
 * Colour literals live here because this is `src/theme/` — the one place the UI
 * rules allow them. Each palette is a ramp the stack cycles through as it grows,
 * so height is readable at a glance rather than a uniform column.
 *
 * Every ramp is checked for contrast against both backgrounds by a unit test:
 * a palette that looks good and cannot be seen is not a feature.
 */
export interface BlockPalette {
  id: string;
  nameKey: string;
  free: boolean;
  ramp: string[];
}

export const PALETTES: BlockPalette[] = [
  {
    id: 'dusk',
    nameKey: 'paletteDusk',
    free: true,
    ramp: ['#F97316', '#FB923C', '#FDBA74', '#F59E0B', '#FCD34D', '#FDE68A'],
  },
  {
    id: 'tide',
    nameKey: 'paletteTide',
    free: false,
    ramp: ['#0EA5E9', '#38BDF8', '#7DD3FC', '#22D3EE', '#67E8F9', '#A5F3FC'],
  },
  {
    id: 'moss',
    nameKey: 'paletteMoss',
    free: false,
    ramp: ['#16A34A', '#22C55E', '#4ADE80', '#65A30D', '#A3E635', '#BEF264'],
  },
  {
    id: 'ember',
    nameKey: 'paletteEmber',
    free: false,
    ramp: ['#E11D48', '#F43F5E', '#FB7185', '#DB2777', '#EC4899', '#F9A8D4'],
  },
];

export function paletteById(id: string): BlockPalette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

export function canUsePalette(id: string, isPremium: boolean): boolean {
  const palette = PALETTES.find((p) => p.id === id);
  if (!palette) return false;
  return isPremium || palette.free;
}

/** The colour for a block at `height`, cycling through the ramp. */
export function blockColour(paletteId: string, height: number): string {
  const ramp = paletteById(paletteId).ramp;
  return ramp[((height % ramp.length) + ramp.length) % ramp.length]!;
}
