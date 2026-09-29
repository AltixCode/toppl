import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";

import Home from "../index";
import { renderWithProviders } from "@/components/__tests__/renderWithProviders";
import { t } from "@/i18n";
import * as stack from "@/logic/stack";
import { useAdsConsentStore } from "@/store/useAdsConsentStore";
import { usePremiumStore } from "@/store/usePremiumStore";
import { useStackStore } from "@/store/useStackStore";

// The game screen calls the shared sound hook directly rather than through a
// Pressable wrapper, so the hook is mocked at the module boundary and every
// assertion here is "was `play` called with the right name", not anything
// about the native audio player itself -- that is `useSoundEffects`'s own
// test's job.
const mockPlay = jest.fn();
jest.mock("@/hooks/useSoundEffects", () => ({
  useSoundEffects: () => mockPlay,
}));

// `drop`/`isGameOver` are mocked (kept otherwise real via `requireActual`) so a
// tap's outcome -- a normal landing, a perfect one, or a bust -- is chosen by
// the test instead of depending on the swinging block's real-time position,
// which is what the rest of the screen's tests never had to control.
jest.mock("@/logic/stack", () => ({
  ...jest.requireActual("@/logic/stack"),
  drop: jest.fn(),
  isGameOver: jest.fn(),
}));

const mockedDrop = stack.drop as jest.Mock;
const mockedIsGameOver = stack.isGameOver as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({
    consent: { canServeAds: true, offerPrivacyOptions: false },
  });
  useStackStore.setState({ runs: [], paletteId: "dusk" });
});

async function startAndTap({
  getByText,
  getByLabelText,
}: ReturnType<typeof renderWithProviders> extends Promise<infer T>
  ? T
  : never) {
  await fireEvent.press(getByText(t("startCta")));
  await waitFor(() => expect(getByLabelText(t("tapToDrop"))).toBeTruthy());
  await fireEvent.press(getByLabelText(t("tapToDrop")));
}

describe("Home sound effects", () => {
  it("plays a tap sound on a normal landing", async () => {
    mockedDrop.mockReturnValue({
      block: { x: 0, width: 40 },
      trimmed: 10,
      perfect: false,
    });
    mockedIsGameOver.mockReturnValue(false);
    const screen = await renderWithProviders(<Home />);
    await startAndTap(screen);
    expect(mockPlay).toHaveBeenCalledWith("tap");
    expect(mockPlay).not.toHaveBeenCalledWith("pop");
    expect(mockPlay).not.toHaveBeenCalledWith("fail");
  });

  it("plays a pop sound on a perfect landing", async () => {
    mockedDrop.mockReturnValue({
      block: { x: 0, width: 100 },
      trimmed: 0,
      perfect: true,
    });
    mockedIsGameOver.mockReturnValue(false);
    const screen = await renderWithProviders(<Home />);
    await startAndTap(screen);
    expect(mockPlay).toHaveBeenCalledWith("pop");
    expect(mockPlay).not.toHaveBeenCalledWith("tap");
  });

  it("plays a fail sound and shows a boxed, exclaimed game-over message when the tower topples", async () => {
    mockedDrop.mockReturnValue({
      block: { x: 0, width: 0 },
      trimmed: 100,
      perfect: false,
    });
    mockedIsGameOver.mockReturnValue(true);
    const screen = await renderWithProviders(<Home />);
    await startAndTap(screen);
    expect(mockPlay).toHaveBeenCalledWith("fail");
    await waitFor(() =>
      expect(screen.getByText(t("gameOverTitle"))).toBeTruthy(),
    );
    expect(t("gameOverTitle")).toMatch(/!$/);
  });
});
