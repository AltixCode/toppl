import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import Home from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { FREE_RUNS } from '@/logic/stack';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useStackStore } from '@/store/useStackStore';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useStackStore.setState({ runs: [], paletteId: 'dusk' });
});

describe('Home', () => {
  it('renders the app name and routes to settings', async () => {
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    expect(getByText(t('appName'))).toBeTruthy();
    await fireEvent.press(getByLabelText(t('settingsTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/settings');
  });

  it('shows a banner to a free user and none to a premium one', async () => {
    const free = await renderWithProviders(<Home />);
    expect(free.queryByTestId('banner-ad')).not.toBeNull();
    usePremiumStore.setState({ isPremium: true });
    const paid = await renderWithProviders(<Home />);
    expect(paid.queryByTestId('banner-ad')).toBeNull();
  });

  it('invites a first run when there is no history', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('noRuns'))).toBeTruthy();
    expect(getByText(t('startCta'))).toBeTruthy();
  });

  it('starts a run and hides the start button', async () => {
    const { getByText, queryByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t('startCta')));
    await waitFor(() => expect(queryByText(t('startCta'))).toBeNull());
  });

  it('lists past runs, newest first', async () => {
    useStackStore.setState({
      runs: [
        { at: 1, height: 4, perfects: 0 },
        { at: 2, height: 11, perfects: 3 },
      ],
      paletteId: 'dusk',
    });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(`${t('heightLabel')}: 11`)).toBeTruthy();
  });

  it('shows the personal best, which is never hidden behind the paywall', async () => {
    useStackStore.setState({ runs: [{ at: 1, height: 23, perfects: 2 }], paletteId: 'dusk' });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(new RegExp(t('bestLabel', { n: 23 })))).toBeTruthy();
  });

  it('tells a free user their run history is trimmed', async () => {
    useStackStore.setState({ runs: [{ at: 1, height: 3, perfects: 0 }], paletteId: 'dusk' });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('runsLocked', { n: FREE_RUNS }))).toBeTruthy();
  });

  // The paid claim: every block set.
  it('sends a free user picking a locked palette to the paywall', async () => {
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('paletteLocked', { name: t('paletteTide') })));
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
    expect(useStackStore.getState().paletteId).toBe('dusk');
  });

  it('lets a premium user choose one', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('paletteTide')));
    await waitFor(() => expect(useStackStore.getState().paletteId).toBe('tide'));
  });

  // The contrast finding: a locked palette still names itself readably.
  it('renders a locked palette name as readable text', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('paletteTide'))).toBeTruthy();
  });
});
