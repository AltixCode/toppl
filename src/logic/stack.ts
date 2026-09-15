/**
 * The stack: where the swinging block is, what a drop leaves behind, and when
 * the run ends.
 *
 * Pure and dependency-free. The swing is a function of elapsed time rather than
 * an animation callback, so a drop at any moment can be tested exactly without
 * waiting for the block to get there.
 */

export interface Block {
  /** Left edge, in playfield units. */
  x: number;
  width: number;
}

/** The width of the first block, and the widest a block can ever be. */
export const START_WIDTH = 120;

/**
 * A drop this close to centre counts as perfect and loses nothing.
 *
 * Without a tolerance a "perfect" drop is unhittable — the swing moves in
 * continuous time, so landing on exactly zero offset is a measure-zero event.
 * A forgiving band is the difference between a skill the player can feel and
 * one they can only achieve by accident.
 */
export const PERFECT_TOLERANCE = 4;

/** Runs a free player keeps in their history. */
export const FREE_RUNS = 5;

/**
 * Where the block is at `elapsedMs`, bouncing between the playfield edges.
 *
 * A triangle wave rather than a sine: the speed is then constant, so the block
 * is equally hittable everywhere instead of crawling at the edges and racing
 * through the middle, which is what makes a sine-driven version feel unfair.
 */
export function swingX(elapsedMs: number, fieldWidth: number, blockWidth: number, speed: number): number {
  const span = Math.max(0, fieldWidth - blockWidth);
  if (span === 0) return 0;
  const period = (2 * span) / Math.max(0.0001, speed);
  const t = ((elapsedMs / 1000) % period + period) % period;
  const distance = t * speed;
  return distance <= span ? distance : 2 * span - distance;
}

/** Playfield units per second, rising with the stack. */
export function speedForHeight(height: number): number {
  return 90 + Math.min(height, 40) * 6;
}

export interface DropResult {
  block: Block;
  trimmed: number;
  perfect: boolean;
}

/**
 * What a drop leaves: the overlap with the block below, and what fell away.
 *
 * A complete miss returns width 0 rather than a negative width, which would
 * otherwise flow into the next block and produce a stack that grows as you fail.
 */
export function drop(moving: Block, below: Block): DropResult {
  const offset = moving.x - below.x;

  if (Math.abs(offset) <= PERFECT_TOLERANCE) {
    // Snapped to the block below, so a run of perfect drops does not drift.
    return { block: { x: below.x, width: moving.width }, trimmed: 0, perfect: true };
  }

  const left = Math.max(moving.x, below.x);
  const right = Math.min(moving.x + moving.width, below.x + below.width);
  const width = Math.max(0, right - left);

  return {
    block: { x: width === 0 ? below.x : left, width },
    trimmed: moving.width - width,
    perfect: false,
  };
}

export function isGameOver(block: Block): boolean {
  return block.width <= 0;
}
