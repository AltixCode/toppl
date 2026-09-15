# Toppl — handoff

What was actually run, and what is still unknown. **Unverified is `UNKNOWN`,
never a pass** — a green build is not a verification.

Last updated: 2026-09-15

## ⚠️ Build 24 crashes on launch, on a real device

Reported by the account owner on 2026-09-15: **toppl dies immediately on
launch** from its TestFlight build.

Build 24 is commit `5b7ab27`. It went to TestFlight **without this app ever
having been run, once, anywhere** — the row below saying "not run" was
accurate at the time it was uploaded. That is the whole lesson: a build is not
a verification, and nothing stopped an unverified binary reaching a device.

What has been established, each by checking rather than by reasoning:

- A **Debug** build on a simulator launches and runs fine, so the fault is
  release-only or device-only.
- Dependencies are identical across all six apps built that evening, and
  `app.config.ts` matches a known-good app apart from colours.
- The screen tests pass under RNTL, so it is not a plain render error.
- `NSUserTrackingUsageDescription` **is** present in the generated
  `Info.plist`, so it is not the classic ATT-without-a-usage-string kill.
- The AdMob identifiers do arrive populated in CI (they render masked in the
  job log, where a genuinely empty secret renders blank).

Two fixes since build 24 are candidates, neither confirmed:

1. `app.config.ts` used `process.env.ADMOB_IOS_APP_ID ?? <test id>`. `??` only
   catches null and undefined, and a GitHub Actions expression for a missing or
   empty secret renders as the empty **string** — which passes straight through
   and ships an empty `GADApplicationIdentifier`. The Google Mobile Ads SDK
   treats that as a programming error and deliberately aborts. Now `||`.
2. `check:release` now rejects a *malformed* identifier as well as a missing
   one. An AdMob app id (`~`) and an ad unit id (`/`) differ by one character
   and were interchangeable as far as every previous gate was concerned; the
   wrong one in the app-id slot aborts the SDK the same way.

**The remaining test is a fresh CI build with both fixes in.** If it still
crashes, the next step is the device crash report, which names the faulting
frame directly.

Assume the other five apps built that evening — quiktap, flipnest, poplet,
solari and its sibling — are in the same state until one of them is launched.


## What this app is

Toppl is a one-tap stacking game with four block palettes. A unit test proves every palette colour stays visible on both backgrounds.

Built 2026-09-15 from an empty scaffold: before that the repo held four template
screens and no logic at all, while the tagline, the store record and the paywall
all described a game that did not exist.

## Verification state

| Gate | State | Evidence |
|---|---|---|
| Lint | ✅ | `npm run verify` 2026-09-15 |
| Typecheck | ✅ | `npm run verify` 2026-09-15 |
| Unit tests | ✅ | logic, store and screen tests |
| i18n completeness (14 locales) | ✅ | `npm run check:i18n` |
| Locale scripts (no mixed writing systems) | ✅ | `check-locale-scripts.mjs` |
| UI rules (colour tokens, `t()`) | ✅ | `npm run check:ui` |
| Paywall copy describes this app | ✅ | `check-paywall-copy.mjs` — the claims are backed by code |
| iOS + Android bundle export | ✅ | `expo export` both platforms |
| CI green | ⬜ | queued at last check |
| Builds, installs, launches on a simulator | ⬜ | **not run — belongs to dev-3a** |
| The game actually plays on hardware | ⬜ | **not run** |
| Purchase flow against a real offering | ⬜ | needs a build on hardware |
| Ads served under real consent | ⬜ | needs a build on hardware |

## Store and service state

| | State | Id |
|---|---|---|
| Bundle id registered | ✅ | `com.altixcode.toppl` |
| App Store Connect record | ✅ | 6812275838 |
| App Store listing copy | ✅ | description, keywords and promotional text written against this app's source |
| App Store screenshots | ❌ | **none** — needs the app running on hardware |
| iOS IAP created and priced | ✅ | 6812276942 |
| Play Console app | ⛔ | blocked: account quota at 15 apps, support request filed |
| AdMob + RevenueCat | ✅ | provisioned account-wide |

## Known UNKNOWNs

- **Nothing here has run on hardware.** The game has never been played. A full
  test suite says the rules are right; it says nothing about whether the app
  launches, whether a tap lands, or whether the screen is legible at arm's
  length. Those rows stay ⬜ until dev-3a runs them.
- Screenshots and the IAP review screenshot both need that same device pass.
