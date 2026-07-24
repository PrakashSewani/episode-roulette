# Chrome Validation Checklist

Use this checklist to validate the unchanged universal WebExtension in current stable desktop Chrome. The authoritative testing contract remains in `docs/testing.md`; this file is a convenient execution and reporting checklist.

## Prerequisites

- Use a logged-in Netflix normal profile, not a Kids profile.
- Set the Netflix UI language to English.
- Use the latest stable desktop Chrome.
- Do not modify files under `dist/webextension/`.

## Build

From the repository root, run:

```bash
npm run build
```

Expected output directory:

```text
/Users/prakashsewani/Desktop/episode-roulette/dist/webextension/
```

## Install In Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Remove or disable an older Episode Roulette installation, if present.
4. Select **Load unpacked**.
5. Choose `dist/webextension/` from this repository.
6. Confirm the extension card appears without an error badge.
7. Open the extension's **Details** page.
8. Confirm site access is limited to Netflix.
9. Return to `chrome://extensions` and confirm the extension card does not show a service-worker link.

## Browser Console

1. Open `https://www.netflix.com/`.
2. Open Chrome DevTools with `Option+Command+I` on macOS.
3. Select the **Console** tab.
4. Keep the console open while running the checks below.
5. If a check fails, preserve every `[Episode Roulette]` error and its expanded stack/details.

## Installation Contract

- [ ] Extension loads from `dist/webextension/` without modification.
- [ ] No manifest or extension-loading error appears.
- [ ] Site access is limited to `*.netflix.com`.
- [ ] No background service worker is registered.
- [ ] Netflix loads normally with the extension enabled.

## Detection And UI

- [ ] Open a TV series through a Netflix detail overlay; **Random Episode** appears next to Play or Next Episode.
- [ ] Open a movie detail overlay; the button does not appear.
- [ ] Close the series overlay; the button and any toast disappear.
- [ ] Open another series; exactly one button appears for the new title.
- [ ] Opening a series does not switch seasons until the button is clicked.
- [ ] The button immediately enters loading state after a click.

## Numeric Seasons

Choose a conventional multi-season series whose dropdown uses labels such as `Season 1`.

- [ ] Click **Random Episode**.
- [ ] Netflix traverses the available seasons without failing.
- [ ] Truncated episode sections expand when necessary.
- [ ] A selection toast shows season, episode number, and title.
- [ ] Netflix enters `/watch/` and starts the selected episode.
- [ ] No failure toast appears after playback starts.

## Named Seasons

Use JoJo's Bizarre Adventure or another series with named dropdown entries.

- [ ] The dropdown options are enumerated, including combined labels such as `Phantom Blood/Battle Tendency`.
- [ ] Traversal reaches the first and last named options.
- [ ] `Diamond Is Unbreakable` completes without `Episode rows did not stabilize`.
- [ ] Declared counts, when shown, match the collected episode rows.
- [ ] A selection toast shows the named season, episode number, and title.
- [ ] The selected named season is reactivated before playback.
- [ ] Netflix enters `/watch/` and starts the selected episode.

## Cache And Retry

To test cache reuse, finish one successful selection, return to the same series without reloading the Netflix tab, and click again.

- [ ] The second click does not visibly traverse every season again.
- [ ] The second click produces a fresh random selection.
- [ ] Repeating the same episode remains possible and is not treated as an error.
- [ ] Closing and reopening the same series overlay does not clear its catalog.
- [ ] Reloading the Netflix tab naturally clears the in-memory catalog.

To test a retryable failure, use DevTools to temporarily enable **Offline** immediately after clicking the button, or reproduce a natural Netflix rendering failure, then restore the network.

- [ ] Failure produces an enabled error-state button and an error toast.
- [ ] The error toast disappears after approximately five seconds.
- [ ] Clicking the error-state button starts a new attempt.
- [ ] A later failure replaces an earlier selection toast.

Do not use offline mode as proof of a specific discovery error message; it is only a general retry-state check.

## Cancellation

- [ ] Click **Random Episode**, then immediately close the detail overlay; no stale toast or playback occurs.
- [ ] Click **Random Episode**, then immediately open a different series; the old operation does not affect the new title.
- [ ] Fast navigation between two series leaves only the current title's button.
- [ ] Starting playback removes the title-detail button and toast.
- [ ] No late result from the prior title updates the current UI.

## Result

Record the outcome here or send it back in this format:

```text
Chrome version:
Netflix UI language:
Extension installed without errors: PASS/FAIL
Movie exclusion: PASS/FAIL
Numeric-season discovery/playback: PASS/FAIL
Named-season discovery/playback: PASS/FAIL
Selection toast: PASS/FAIL
Cache reuse: PASS/FAIL
Retryable error: PASS/FAIL
Cancellation/navigation: PASS/FAIL
Console errors:
Notes:
```

For every failure, include:

1. The Netflix title and URL.
2. The exact step that failed.
3. What was expected.
4. What happened instead.
5. Complete `[Episode Roulette]` console output.
6. A screenshot when the failure is visible.

## Completion Rule

Phase 7 is complete only when the unchanged `dist/webextension/` package installs and the live Chrome checks pass with behavior equivalent to Safari. If Chrome behaves differently, document the incompatibility before changing shared architecture or adding browser-specific code.
