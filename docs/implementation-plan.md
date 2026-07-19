# Implementation Plan

## Overview

This document defines the implementation phases for Episode Roulette. Work must follow this order. Do not skip phases.

---

## Phase 1: Project Scaffold

**Goal**: Extension loads in Chrome with an empty content script.

**Deliverables**:
- `package.json` with dependencies (`vite`, `typescript`, `@crxjs/vite-plugin`)
- `tsconfig.json` with strict mode, ES2020 target
- `vite.config.ts` configured for Manifest V3 content script bundling
- `public/manifest.json` (Manifest V3) with:
  - `content_scripts` matching `*://*.netflix.com/*`
  - `host_permissions` for `*://*.netflix.com/*`
  - Service worker registration
- `src/content.ts` — minimal entry point, logs "Episode Roulette loaded"
- `src/background.ts` — minimal service worker
- Build scripts in `package.json`

**Exit criteria**: `npm run dev` builds successfully. Loading `dist/` in Chrome shows extension active on Netflix.

---

## Phase 2: Netflix SPA Navigation Detection

**Goal**: Detect when the user navigates to a TV series page on Netflix.

**Modules**:
- `src/netflix/observer.ts`
- `src/netflix/detector.ts`
- `src/netflix/selectors.ts`

**Deliverables**:
- URL polling (500ms interval) that detects URL changes
- MutationObserver on `document.body` for large DOM changes
- `popstate` and `hashchange` event listeners
- Series page detection via URL pattern (`/title/\d+`) and DOM signals (season selector presence)
- `selectors.ts` as single source of truth for all DOM queries
- Event system that emits `series-entered` and `series-left` events

**Exit criteria**: Console logs when user navigates to/from a series page. Works with SPA navigation (no page reload needed).

---

## Phase 3: UI Injection

**Goal**: Inject a styled "Random Episode" button on series pages.

**Modules**:
- `src/ui/button.ts`
- `src/ui/styles.ts`
- `src/ui/feedback.ts`

**Deliverables**:
- Button creation and insertion next to Netflix's Play button
- CSS injection matching Netflix's design language (dark theme, red accent, Netflix font/spacing)
- Three button states: loading, ready, error
- Cleanup on navigation away from series page
- `feedback.ts` for loading spinner and error toast

**Exit criteria**: Button appears on series pages, matches Netflix style, disappears when navigating away.

---

## Phase 4: Episode Discovery

**Goal**: Collect all playable episodes from all seasons of the current series.

**Modules**:
- `src/discovery/season-traverser.ts`
- `src/discovery/episode-collector.ts`
- `src/netflix/dom-utils.ts`

**Deliverables**:
- Season enumeration (find all season tabs/options)
- Programmatic season switching (click each season tab)
- DOM update waiting (MutationObserver with timeout)
- Episode element parsing per season
- Aggregation across all seasons
- In-memory cache keyed by series ID
- `dom-utils.ts` with `resilientQuery()` helper (tries multiple selectors)

**Exit criteria**: For a given series, discovers all episodes across all seasons. Cached per series ID.

---

## Phase 5: Random Selection + Playback

**Goal**: Select a random episode and trigger Netflix-native playback.

**Modules**:
- `src/engine/randomizer.ts`
- `src/engine/navigator.ts`

**Deliverables**:
- Uniform random selection from episode array
- Click simulation on selected episode's DOM element
- Fallback to URL navigation if element reference is stale
- Button click triggers full flow: discover → select → play

**Exit criteria**: Clicking "Random Episode" starts playback of a random episode. Works like manually clicking the episode.

---

## Phase 6: Integration + Polish

**Goal**: Wire all modules together. Handle edge cases. Production quality.

**Deliverables**:
- Full flow in `content.ts`: observe → detect → inject → discover → randomize → play
- Error handling for all failure modes (see `docs/error-handling.md`)
- Loading UX during discovery
- Cache management (per-series, session-based)
- Cleanup on navigation away
- Edge case handling:
  - Movies (no button injected)
  - Single-season series
  - Series with 30+ seasons
  - Fast navigation between series

**Exit criteria**: Extension works end-to-end on real Netflix. Handles edge cases gracefully.

---

## Phase 7: Testing + Validation

**Goal**: Verify everything works. Document testing approach.

**Modules**:
- Unit tests for `randomizer.ts` (pure function)
- Unit tests for selector logic
- Manual testing on real Netflix

**Exit criteria**: All unit tests pass. Manual testing confirms functionality on desktop Chrome.

---

## Notes

- **Do not implement stretch goals** (exclude seasons, repeat prevention, keyboard shortcuts, etc.) until core is complete and approved.
- **Do not add dependencies** not listed in docs.
- **Do not change architecture** without updating `docs/architecture.md` first.
