import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, Text } from '@/components/ui';
import { t, type TranslationKey } from '@/i18n';
import {
  FREE_RUNS,
  START_WIDTH,
  drop,
  isGameOver,
  speedForHeight,
  swingX,
  type Block,
} from '@/logic/stack';
import { noteGameFinished } from '@/monetization/pacing';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useStackStore } from '@/store/useStackStore';
import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';
import { PALETTES, blockColour, canUsePalette } from '@/theme/palettes';

/** Visible rows of stack. Older blocks scroll off the bottom. */
const VISIBLE_ROWS = 9;
const ROW_HEIGHT = 26;
const FRAME_MS = 16;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const isReady = usePremiumStore((s) => s.isReady);
  const hydrate = useStackStore((s) => s.hydrate);
  const record = useStackStore((s) => s.record);
  const history = useStackStore((s) => s.history);
  const best = useStackStore((s) => s.best);
  const paletteId = useStackStore((s) => s.paletteId);
  const choosePalette = useStackStore((s) => s.choosePalette);

  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [stack, setStack] = useState<Block[]>([]);
  const [perfects, setPerfects] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // Measured, so the playfield uses the space it is given rather than a cap.
  const [fieldWidth, setFieldWidth] = useState(0);

  const startedAt = useRef(0);
  const stackRef = useRef<Block[]>([]);
  const perfectsRef = useRef(0);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), FRAME_MS);
    return () => clearInterval(id);
  }, [playing]);

  const top = stack[stack.length - 1] ?? { x: 0, width: START_WIDTH };
  const speed = speedForHeight(stack.length);
  const movingX = fieldWidth > 0 ? swingX(elapsed, fieldWidth, top.width, speed) : 0;

  const start = useCallback(() => {
    const first: Block = { x: Math.max(0, (fieldWidth - START_WIDTH) / 2), width: START_WIDTH };
    stackRef.current = [first];
    perfectsRef.current = 0;
    setStack([first]);
    setPerfects(0);
    startedAt.current = Date.now();
    setElapsed(0);
    setOver(false);
    setPlaying(true);
  }, [fieldWidth]);

  const place = () => {
    if (!playing) return;
    const below = stackRef.current[stackRef.current.length - 1]!;
    const result = drop({ x: movingX, width: below.width }, below);

    if (isGameOver(result.block)) {
      setPlaying(false);
      setOver(true);
      record(stackRef.current.length - 1, perfectsRef.current);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      void noteGameFinished();
      return;
    }

    stackRef.current = [...stackRef.current, result.block];
    setStack(stackRef.current);
    if (result.perfect) {
      perfectsRef.current += 1;
      setPerfects(perfectsRef.current);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      void Haptics.selectionAsync();
    }
    startedAt.current = Date.now();
    setElapsed(0);
  };

  const pickPalette = (id: string) => {
    if (choosePalette(id, isPremium) === 'locked') router.push('/paywall');
  };

  const height = Math.max(0, stack.length - 1);
  const visible = stack.slice(-VISIBLE_ROWS);
  const rows = history(isPremium);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.base,
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.xl,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text variant="title" style={styles.grow}>
            {t('appName')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsTitle')}
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.iconSlot}
          >
            <Feather name="settings" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text variant="display">{height}</Text>
        <Text variant="caption" tone="muted">
          {t('bestLabel', { n: best() })} · {t('perfectsLabel')}: {perfects}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tapToDrop')}
          disabled={!playing}
          onPress={place}
          onLayout={(e) => setFieldWidth(e.nativeEvent.layout.width)}
          style={[
            styles.field,
            {
              height: (VISIBLE_ROWS + 1) * ROW_HEIGHT,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {playing ? (
            <View
              style={[
                styles.block,
                {
                  left: movingX,
                  bottom: visible.length * ROW_HEIGHT,
                  width: top.width,
                  height: ROW_HEIGHT - 2,
                  borderRadius: radius.sm,
                  backgroundColor: blockColour(paletteId, stack.length),
                },
              ]}
            />
          ) : null}
          {visible.map((block, i) => (
            <View
              key={`${block.x}-${block.width}-${i}`}
              style={[
                styles.block,
                {
                  left: block.x,
                  bottom: i * ROW_HEIGHT,
                  width: block.width,
                  height: ROW_HEIGHT - 2,
                  borderRadius: radius.sm,
                  backgroundColor: blockColour(paletteId, stack.length - visible.length + i),
                },
              ]}
            />
          ))}
          {playing ? null : (
            <Text variant="body" tone="muted">
              {over ? t('gameOverTitle') : t('tapToDrop')}
            </Text>
          )}
        </Pressable>

        {playing ? null : (
          <Button label={over ? t('againCta') : t('startCta')} icon="layers" onPress={start} />
        )}

        <Text variant="heading" style={{ marginTop: spacing.base }}>
          {t('paletteTitle')}
        </Text>
        <View style={[styles.chipRow, { gap: spacing.sm }]}>
          {PALETTES.map((palette) => {
            const allowed = canUsePalette(palette.id, isPremium);
            const name = t(palette.nameKey as TranslationKey);
            const chosen = palette.id === paletteId;
            return (
              <Pressable
                key={palette.id}
                accessibilityRole="button"
                accessibilityLabel={allowed ? name : t('paletteLocked', { name })}
                accessibilityState={{ selected: chosen, disabled: !allowed }}
                onPress={() => pickPalette(palette.id)}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.base,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: chosen ? colors.accent : colors.border,
                    backgroundColor: chosen ? withAlpha(colors.accent, 0.16) : colors.surface,
                  },
                ]}
              >
                {/* Full contrast whether locked or not; the lock icon and the
                    accessible label carry the state. */}
                <Text variant="body">{name}</Text>
                {allowed ? null : <Feather name="lock" size={14} color={colors.textMuted} />}
              </Pressable>
            );
          })}
        </View>

        <Text variant="heading" style={{ marginTop: spacing.base }}>
          {t('runsTitle')}
        </Text>
        {rows.length === 0 ? (
          <Text variant="body" tone="muted">
            {t('noRuns')}
          </Text>
        ) : (
          rows.slice(0, 10).map((run) => (
            <Card key={run.at}>
              <View style={styles.row}>
                <Text variant="body" style={styles.grow}>
                  {t('heightLabel')}: {run.height}
                </Text>
                <Text variant="body" tone="muted">
                  {t('perfectsLabel')}: {run.perfects}
                </Text>
              </View>
            </Card>
          ))
        )}
        {isPremium ? null : (
          <Text variant="caption" tone="muted">
            {t('runsLocked', { n: FREE_RUNS })}
          </Text>
        )}
      </ScrollView>
      <BannerAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  iconSlot: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center' },
  block: { position: 'absolute' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: MIN_TOUCH_TARGET },
  row: { flexDirection: 'row', alignItems: 'center' },
});
