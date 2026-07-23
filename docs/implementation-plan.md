# Implementation Plan

## Overview

This document defines the implementation phases for Episode Roulette. Work must follow this order. Do not skip phases.

---

## Phase 1: Project Scaffold

**Goal**: The shared WebExtension content script builds for Chrome and can be wrapped for macOS Safari.

**Deliverables**:
- `package.json` with dependencies (`vite`, `typescript`, `@crxjs/vite-plugin`)
- Committed package lockfile, `.nvmrc`, and matching `package.json#engines` pinned to Node 24 LTS; CI installs with `npm ci`
- `.gitignore` excludes `dist/`, `safari/Extension/Resources/`, `safari/GeneratedVersion.xcconfig`, Xcode user state, DerivedData, and local signing configuration
- `tsconfig.json` with strict mode, ES2020 target
- `vite.config.ts` configured to emit one universal Manifest V3 WebExtension build to `dist/webextension/`
- `src/manifest.ts` as the canonical manifest source, with version read from `package.json`, containing:
  - `content_scripts` matching `*://*.netflix.com/*`
  - `host_permissions` for `*://*.netflix.com/*`
- `src/content.ts` — minimal entry point, logs "Episode Roulette loaded"
- Build scripts in `package.json`:
  - `npm run build` → clean and emit `dist/webextension/`
  - `npm run safari:init` → guarded one-time creation of the Xcode wrapper with `safari-web-extension-converter`; fail if `safari/` contains any entry other than approved bootstrap documentation/placeholders
  - `npm run safari:sync` → run the production build, stage and verify a complete `dist/webextension/` mirror, then replace `safari/Extension/Resources/` and synchronize native marketing versions from `package.json`
  - `npm run safari:build` → sync resources, then perform an unsigned Xcode build
- `safari/EpisodeRoulette.xcodeproj` with shared scheme `EpisodeRoulette`, generated once and committed
- `safari/Extension/Resources/` as uncommitted generated WebExtension resources referenced by the Safari extension target
- Every non-generated app/extension source, plist, entitlement, icon, shared-scheme, and configuration file required for the unsigned Xcode build is committed; user-specific state, credentials, signing artifacts, DerivedData, and generated WebExtension resources are excluded
- The extension target has a committed `Sync WebExtension Resources` build phase that copies the contents of `safari/Extension/Resources/` into `${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/`; no per-generated-file references or project edits occur during synchronization
- A committed `safari/LocalSigning.xcconfig.example` documents local overrides; developers use ignored `safari/LocalSigning.xcconfig` for team and bundle-identifier overrides
- Every build configuration uses committed `safari/Base.xcconfig`, which includes ignored `GeneratedVersion.xcconfig` and optionally includes ignored `LocalSigning.xcconfig`; generated version values precede local signing overrides
- Phase 1 verifies full Xcode installation and records the tested `safari-web-extension-converter` invocation in `docs/safari.md` before creating the wrapper
- Safari wrapper configuration for the same Netflix host access and content script

No background service worker is registered in Chrome or Safari. All core behavior runs in the shared Netflix content script. A background runtime may be added only after a concrete browser-level or cross-tab responsibility is documented and approved.

**Exit criteria**: `npm run build` emits the documented universal Chrome-compatible WebExtension contract, `npm run safari:sync` produces an exact byte-for-byte resource mirror and synchronized marketing versions, and `npm run safari:build` builds the committed Xcode wrapper. A failed sync leaves either the prior verified resource directory or no generated directory, never a partially copied destination. Tests verify generated resources are ignored/untracked and present at the extension bundle root. Manual Chrome loading is deferred to Phase 7 so shared feature implementation can proceed against the verified Safari development environment without creating browser-specific product code.

---

## Phase 2: Netflix SPA Navigation Detection

**Goal**: Track the active Netflix title context and confirm a series from its rendered episodic UI.

**Modules**:
- `src/netflix/observer.ts`
- `src/netflix/detector.ts`
- `src/netflix/selectors.ts`
- `src/netflix/season-controller.ts` (Phase 2 implements only the shared `getValidEpisodeRows()` structural-validation API; Phase 4 adds season interaction)

**Deliverables**:
- URL polling (500ms interval) that detects path and `jbv` changes
- Neutral route events; observer does not classify movies or series
- Temporary MutationObserver on `document.body` only while locating the active title-details root
- Scoped MutationObserver on the active title-details root after it is found
- `popstate` and `hashchange` event listeners
- Candidate title-details detection via `/title/<id>` or a numeric `jbv=<id>` query parameter
- Series confirmation via rendered episode rows; season controls are supporting but optional
- Single-season confirmation when episode rows exist without season controls
- `selectors.ts` as single source of truth for all DOM queries
- Series classification scoped to the active title-details root
- Phase-limited orchestration that records scoped episodic DOM confirmation but defers all UI injection to Phase 3

**Exit criteria**: Title overlay/path changes are detected, movie details do not activate the extension, episodic UI inside the active details root confirms a series, and unrelated browse-page mutations do not affect classification.

---

## Phase 3: UI Injection

**Goal**: Inject a styled "Random Episode" button on series pages.

**Modules**:
- `src/ui/button.ts`
- `src/ui/styles.ts`
- `src/ui/feedback.ts`
- `src/netflix/dom-utils.ts` (Phase 3 implements only `resilientQuery()` and abortable `waitForElement()`; Phase 4 adds the remaining DOM wait utilities)

**Deliverables**:
- Button creation and insertion next to Netflix's Play button
- CSS injection matching Netflix's design language (dark theme, red accent, Netflix font/spacing)
- Three button states: loading, ready, error
- Button is injected enabled in ready state; no episode discovery runs on injection
- Until the discovery/playback flow is wired in Phase 5, the ready button has no registered operation handler and remains ready when clicked
- Cleanup on navigation away from series page
- `button.ts` for state rendering and loading animation; `feedback.ts` for error-toast lifecycle
- `styles.ts` for all extension button, tooltip, animation, and toast CSS

**Exit criteria**: Button appears on series pages, matches Netflix style, disappears when navigating away.

---

## Phase 4: Episode Discovery

**Goal**: Collect all playable episodes from all seasons of the current series.

**Modules**:
- `src/discovery/season-traverser.ts`
- `src/discovery/episode-collector.ts`
- `src/netflix/dom-utils.ts`
- `src/netflix/season-controller.ts`
- `src/netflix/episode-identity.ts`

**Deliverables**:
- Strategy-based season enumeration with implicit-season and verified Netflix custom-dropdown strategies
- Shared abortable season controller used by discovery and playback
- Shared deterministic episode identity parser and resolver used by collector and navigator
- Programmatic custom-dropdown switching using toggle, menu, and menu-item selectors
- DOM update waiting (MutationObserver with timeout)
- Season transition validation using active toggle identity, with changed episode content required only when switching from a different active season
- Episode-section expansion and row-count stabilization
- Exact count validation when Netflix's season menu declares an episode count
- Episode element parsing per season
- Aggregation across all seasons
- One scoped retry for a season that fails to switch or collect
- Atomic completeness policy: no partial randomization or partial cache entries
- `dom-utils.ts` with `resilientQuery()` helper (tries multiple selectors)

**Exit criteria**: For a given series, returns all episodes across all enumerated seasons, or fails after one retry of the failed season without exposing partial results. Traversal has no cache dependency.

---

## Phase 5: Random Selection + Playback

**Goal**: Select a random episode and trigger Netflix-native playback.

**Modules**:
- `src/engine/randomizer.ts`
- `src/engine/navigator.ts`

**Deliverables**:
- Uniform random selection from episode array
- Durable episode metadata with no cached DOM references
- Reactivate selected season, expand it, and uniquely re-resolve the current episode row
- Native click only after identity validation; no title-URL fallback
- Button click changes the button to loading and triggers the full flow: cache lookup → discover if needed → select → play

**Exit criteria**: Clicking "Random Episode" re-resolves and clicks exactly the selected Netflix episode. Ambiguous or inconsistent matches fail without clicking another episode.

---

## Phase 6: Integration + Polish

**Goal**: Wire all modules together. Handle edge cases. Production quality.

**Deliverables**:
- Full flow in `content.ts`: observe → detect → inject ready button → user click → discover/cache → randomize → play
- Error handling for all failure modes (see `docs/error-handling.md`)
- Loading UX during discovery
- Persistent clickable error state with a five-second toast and explicit user retry
- Complete-catalog cache management per series until tab refresh/close
- `content.ts` is the sole cache owner and guards every cache write by active generation and title ID
- No selection history, playback history, repeat prevention, or probability weighting
- One invalidation and fresh discovery when live playback validation proves cached metadata stale
- Cleanup on navigation away
- AbortController cancellation plus monotonically increasing title-context generation
- Stale-side-effect guards before cache writes, UI updates, randomization, and final playback click
- Five-second `/watch/` confirmation after native episode click
- Idempotent content-script `start()`/`stop()` lifecycle with `pagehide` teardown
- Edge case handling:
  - Movies (no button injected)
  - Single-season series
  - Series with 30+ seasons
  - Netflix custom season dropdown
  - Initially truncated episode lists
  - Fast navigation between series

**Exit criteria**: Extension works end-to-end on real Netflix. Handles edge cases gracefully.

---

## Phase 7: Chrome Compatibility Validation

**Goal**: Validate the completed shared WebExtension implementation in desktop Chrome without forking browser behavior.

**Deliverables**:
- Load `dist/webextension/` as an unpacked extension in current stable desktop Chrome
- Confirm the emitted Manifest V3 extension installs without browser-specific rewriting
- Confirm Netflix-only host access and no background service worker
- Run the completed shared feature flow on live Netflix in a logged-in normal profile
- Validate route detection, series classification, UI injection, complete discovery, random playback, cancellation, cache behavior, and retryable errors
- Record any Chrome-specific incompatibility before introducing a browser adapter or runtime branch
- Keep all product logic shared; any required browser-specific runtime behavior needs a documented incompatibility, architecture update, and user approval

**Exit criteria**: The universal `dist/webextension/` build loads directly in desktop Chrome and passes the Chrome live smoke checklist with behavior equivalent to the Safari implementation. Any incompatibility is documented and resolved without an undocumented browser fork.

---

## Phase 8: Testing + Validation

**Goal**: Complete automated, packaging, CI, and cross-browser release validation.

**Modules**:
- Vitest unit tests for selectors, detector, DOM utilities, parsing, normalization, randomization, and matching
- jsdom fixture integration tests for orchestration, custom-dropdown traversal, expansion, retries, cancellation, caching, feedback, and playback resolution
- Reusable Netflix desktop fixture builders for movie, implicit-season, and multi-season detail overlays
- Manual smoke testing on real Netflix in desktop Chrome and macOS Safari with logged-in normal profiles
- CI runs `npm test` and `npm run build` on all supported runners; a macOS job also runs `npm run safari:build`

**Exit criteria**: All unit and fixture integration tests pass, the universal build succeeds, the unsigned Safari Xcode wrapper build succeeds on macOS CI, and the live Netflix smoke checklist passes in desktop Chrome and macOS Safari. Kids profiles, iOS/iPadOS Safari, and automated live-Netflix E2E are out of scope.

---

## Notes

- **Do not implement stretch goals** (exclude seasons, repeat prevention, keyboard shortcuts, etc.) until core is complete and approved.
- **Approved dependencies/tools**: runtime/build dependencies listed in Phase 1, `vitest` and `jsdom` as development-only test dependencies, and Apple Xcode plus `safari-web-extension-converter` for Safari packaging.
- **Do not change architecture** without updating `docs/architecture.md` first.
