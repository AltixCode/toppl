/**
 * Runs played and the chosen block palette.
 *
 * Both paid claims live here: every palette, and keeping more than the last few
 * runs. Each takes `isPremium` explicitly at the call site.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { FREE_RUNS } from '@/logic/stack';
import { PALETTES, canUsePalette } from '@/theme/palettes';

export const STACK_CACHE_KEY = 'toppl.state.v1';

const MAX_RUNS = 300;
const DEFAULT_PALETTE = 'dusk';

export interface Run {
  at: number;
  height: number;
  perfects: number;
}

interface StackState {
  runs: Run[];
  paletteId: string;

  record: (height: number, perfects: number, at?: number) => void;
  history: (isPremium: boolean) => Run[];
  best: () => number;
  choosePalette: (id: string, isPremium: boolean) => 'ok' | 'locked' | 'unknown';
  persist: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function validRuns(value: unknown): Run[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is Run =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as Run).at === 'number' &&
      typeof (r as Run).height === 'number' &&
      typeof (r as Run).perfects === 'number',
  );
}

export const useStackStore = create<StackState>((set, get) => ({
  runs: [],
  paletteId: DEFAULT_PALETTE,

  record(height, perfects, at = Date.now()) {
    set((s) => ({ runs: [...s.runs, { at, height, perfects }].slice(-MAX_RUNS) }));
    void get().persist();
  },

  history(isPremium) {
    const sorted = [...get().runs].sort((a, b) => b.at - a.at);
    return isPremium ? sorted : sorted.slice(0, FREE_RUNS);
  },

  /**
   * The tallest stack ever built, across every run rather than the visible ones.
   * A personal best hidden behind the paywall would be the player's own number
   * withheld from them.
   */
  best() {
    return get().runs.reduce((tallest, run) => Math.max(tallest, run.height), 0);
  },

  choosePalette(id, isPremium) {
    if (!PALETTES.some((p) => p.id === id)) return 'unknown';
    if (!canUsePalette(id, isPremium)) return 'locked';
    set({ paletteId: id });
    void get().persist();
    return 'ok';
  },

  async persist() {
    try {
      const { runs, paletteId } = get();
      await AsyncStorage.setItem(STACK_CACHE_KEY, JSON.stringify({ runs, paletteId }));
    } catch {
      // A lost history is survivable; a failed launch is not.
    }
  },

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(STACK_CACHE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const record = parsed as Record<string, unknown>;
      const stored = typeof record.paletteId === 'string' ? record.paletteId : DEFAULT_PALETTE;
      set({
        runs: validRuns(record.runs),
        // An unknown palette falls back rather than rendering nothing. This also
        // covers a palette removed in a later version.
        paletteId: PALETTES.some((p) => p.id === stored) ? stored : DEFAULT_PALETTE,
      });
    } catch {
      // Unreadable storage starts empty rather than preventing launch.
    }
  },
}));
