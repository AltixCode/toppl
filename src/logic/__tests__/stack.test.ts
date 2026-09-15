import {
  FREE_RUNS,
  PERFECT_TOLERANCE,
  drop,
  isGameOver,
  speedForHeight,
  swingX,
  type Block,
} from '../stack';

// A moving block is always the same width as the one below it — that is what
// makes an overhang cost something. A wider base would let every drop overlap
// fully and the overlap tests would pass for the wrong reason.
const base: Block = { x: 0, width: 100 };

describe('the swing', () => {
  it('stays inside the playfield', () => {
    for (let ms = 0; ms < 20_000; ms += 37) {
      const x = swingX(ms, 300, 60, 1);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(300 - 60);
    }
  });

  it('is deterministic, so a drop can be tested without waiting for one', () => {
    expect(swingX(1234, 300, 60, 1)).toBe(swingX(1234, 300, 60, 1));
  });

  it('actually moves', () => {
    const a = swingX(0, 300, 60, 1);
    const b = swingX(700, 300, 60, 1);
    expect(a).not.toBeCloseTo(b, 3);
  });

  it('reverses rather than jumping when it reaches an edge', () => {
    // Sampled densely, consecutive positions never jump more than a small step.
    let previous = swingX(0, 300, 60, 1);
    for (let ms = 10; ms < 8000; ms += 10) {
      const next = swingX(ms, 300, 60, 1);
      expect(Math.abs(next - previous)).toBeLessThan(20);
      previous = next;
    }
  });

  it('moves faster as the stack grows', () => {
    expect(speedForHeight(20)).toBeGreaterThan(speedForHeight(1));
  });
});

describe('dropping', () => {
  it('keeps only the overlap', () => {
    const result = drop({ x: 20, width: 100 }, base);
    expect(result.block.width).toBe(80);
    expect(result.block.x).toBe(20);
    expect(result.trimmed).toBe(20);
  });

  it('handles an overhang on the other side', () => {
    const result = drop({ x: -30, width: 100 }, base);
    expect(result.block.width).toBe(70);
    expect(result.block.x).toBe(0);
    expect(result.trimmed).toBe(30);
  });

  it('calls a dead-centre drop perfect and keeps the full width', () => {
    const result = drop({ x: 0, width: 100 }, base);
    expect(result.perfect).toBe(true);
    expect(result.block.width).toBe(100);
    expect(result.trimmed).toBe(0);
  });

  it('forgives a drop within the tolerance, so a near miss is not punished', () => {
    const result = drop({ x: PERFECT_TOLERANCE - 0.01, width: 100 }, base);
    expect(result.perfect).toBe(true);
    expect(result.block.width).toBe(100);
  });

  it('does not forgive a drop outside the tolerance', () => {
    const result = drop({ x: PERFECT_TOLERANCE + 2, width: 100 }, base);
    expect(result.perfect).toBe(false);
    expect(result.block.width).toBeLessThan(100);
  });

  it('reports a total miss as zero width rather than a negative one', () => {
    const result = drop({ x: 500, width: 100 }, base);
    expect(result.block.width).toBe(0);
    expect(result.trimmed).toBe(100);
  });
});

describe('game over', () => {
  it('ends when nothing is left to stand on', () => {
    expect(isGameOver({ x: 0, width: 0 })).toBe(true);
    expect(isGameOver({ x: 0, width: 1 })).toBe(false);
  });
});

describe('runs kept', () => {
  it('keeps a handful for a free player', () => {
    expect(FREE_RUNS).toBeGreaterThan(0);
  });
});
