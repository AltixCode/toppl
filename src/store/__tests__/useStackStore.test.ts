import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_RUNS } from '@/logic/stack';
import { STACK_CACHE_KEY, useStackStore } from '../useStackStore';

const reset = () => useStackStore.setState({ runs: [], paletteId: 'dusk' });

beforeEach(async () => {
  await AsyncStorage.clear();
  reset();
});

describe('runs', () => {
  it('records a run', () => {
    useStackStore.getState().record(12, 3, 1000);
    expect(useStackStore.getState().history(true)).toHaveLength(1);
  });

  it('shows a free player only their recent runs', () => {
    for (let i = 0; i < FREE_RUNS + 3; i += 1) useStackStore.getState().record(i, 0, i + 1);
    expect(useStackStore.getState().history(false)).toHaveLength(FREE_RUNS);
    expect(useStackStore.getState().history(true)).toHaveLength(FREE_RUNS + 3);
  });

  it('keeps the best height across every run, not only the visible ones', () => {
    useStackStore.getState().record(40, 5, 1);
    for (let i = 0; i < FREE_RUNS + 2; i += 1) useStackStore.getState().record(3, 0, i + 2);
    expect(useStackStore.getState().best()).toBe(40);
  });

  it('has no best before the first run', () => {
    expect(useStackStore.getState().best()).toBe(0);
  });

  it('shows the newest run first', () => {
    useStackStore.getState().record(5, 0, 1);
    useStackStore.getState().record(9, 0, 2);
    expect(useStackStore.getState().history(true)[0]?.height).toBe(9);
  });
});

describe('palettes', () => {
  it('lets a paid player choose one', () => {
    expect(useStackStore.getState().choosePalette('tide', true)).toBe('ok');
    expect(useStackStore.getState().paletteId).toBe('tide');
  });

  it('refuses a paid palette for a free player and keeps the current one', () => {
    expect(useStackStore.getState().choosePalette('tide', false)).toBe('locked');
    expect(useStackStore.getState().paletteId).toBe('dusk');
  });

  it('refuses one that does not exist', () => {
    expect(useStackStore.getState().choosePalette('nope', true)).toBe('unknown');
  });
});

describe('hydrate', () => {
  it('restores runs and the palette', async () => {
    useStackStore.getState().record(7, 1, 1);
    useStackStore.getState().choosePalette('moss', true);
    await useStackStore.getState().persist();
    reset();
    await useStackStore.getState().hydrate();
    expect(useStackStore.getState().history(true)).toHaveLength(1);
    expect(useStackStore.getState().paletteId).toBe('moss');
  });

  it('starts empty rather than throwing on unreadable storage', async () => {
    await AsyncStorage.setItem(STACK_CACHE_KEY, 'not json');
    await useStackStore.getState().hydrate();
    expect(useStackStore.getState().history(true)).toEqual([]);
  });

  it('drops a stored palette the player is not entitled to keep', async () => {
    await AsyncStorage.setItem(STACK_CACHE_KEY, JSON.stringify({ runs: [], paletteId: 'nonsense' }));
    await useStackStore.getState().hydrate();
    expect(useStackStore.getState().paletteId).toBe('dusk');
  });
});
