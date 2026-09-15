import { PALETTES, blockColour, canUsePalette, paletteById } from '../palettes';
import { contrastRatio } from '../color';
import { darkPalette, lightPalette } from '../tokens';

describe('palettes', () => {
  it('has exactly one free palette, so the paid claim is real', () => {
    expect(PALETTES.filter((p) => p.free)).toHaveLength(1);
    expect(PALETTES.length).toBeGreaterThan(1);
  });

  it('gates the paid ones', () => {
    const paid = PALETTES.find((p) => !p.free)!;
    expect(canUsePalette(paid.id, false)).toBe(false);
    expect(canUsePalette(paid.id, true)).toBe(true);
  });

  it('refuses one that does not exist', () => {
    expect(canUsePalette('nonsense', true)).toBe(false);
  });

  it('falls back rather than crashing on an unknown id', () => {
    expect(paletteById('nonsense').id).toBe(PALETTES[0]!.id);
  });

  it('cycles the ramp so a tall stack stays readable', () => {
    const { ramp } = PALETTES[0]!;
    expect(blockColour('dusk', 0)).toBe(ramp[0]);
    expect(blockColour('dusk', ramp.length)).toBe(ramp[0]);
    expect(blockColour('dusk', -1)).toBe(ramp[ramp.length - 1]);
  });

  // A block the player cannot see is not a colour scheme, it is a bug.
  it('keeps every ramp colour visible against both backgrounds', () => {
    for (const palette of PALETTES) {
      for (const colour of palette.ramp) {
        expect(contrastRatio(colour, darkPalette.background)).toBeGreaterThan(1.9);
        expect(contrastRatio(colour, lightPalette.background)).toBeGreaterThan(1.05);
      }
    }
  });
});
