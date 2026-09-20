# Implementation Plan

## Overview

This document defines the implementation phases for Episode Roulette. Work must follow this order. Do not skip phases.

---

## Phase 1: Project Scaffold

**Goal**: The shared WebExtension content script builds for Chrome and can be wrapped for macOS Safari.

**Deliverables**:
- `package.json` with dependencies (`vite`, `typescript`, `@crxjs/vite-plugin`)
- Committed package lockfile and matching `package.json#engines` pinned to Node 24 LTS; CI installs with `npm ci`
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

**Superseded for onboarding only (2026-09-14)**: Phase 12 adds a single background service worker whose only responsibility is the install and uninstall onboarding redirects. See `docs/module-specs/background.ts.md`.

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
- While waiting up to five seconds for Netflix's Play button after series confirmation, show a disabled `Loading Episode Roulette...` indicator over the lower-left of the active title-details root; replace it with the ready button when placement becomes available, and remove it silently on timeout or cancellation
- CSS injection matching Netflix's design language (dark theme, red accent, Netflix font/spacing)
- Three button states: loading, ready, error
- Button is injected enabled in ready state; no episode discovery runs on injection
- Until the discovery/playback flow is wired in Phase 5, the ready button has no registered operation handler and remains ready when clicked
- Cleanup on navigation away from series page
- `button.ts` for state rendering and loading animation; `feedback.ts` for error-toast lifecycle
- `styles.ts` for all extension button, tooltip, animation, and toast CSS

**Exit criteria**: Confirmed series show immediate disabled spawn feedback while Play-button placement is pending; the ready button appears next to Play when available, matches Netflix style, and all extension UI disappears on timeout, cancellation, or navigation away.

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
- DOM-driven season initialization, activation, expansion, and stabilization with a 10-second absolute safety deadline per attempt
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
- Button click changes the button to loading and triggers the Phase 5 uncached flow: fresh complete discovery → select → play
- Phase 5 logs non-abort failures and returns the button to ready for explicit retry; cache ownership, typed user-facing error dispatch, stale-cache rediscovery, and `/watch/` confirmation remain Phase 6 responsibilities

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
  - Named season labels, including name-only entries, with durable normalized identity
  - Fast navigation between series
- Five-second selection status toast with season and episode information; exact later failures replace it

**Exit criteria**: Extension works end-to-end on real Netflix. Handles edge cases gracefully.

---

## Phase 7: Chrome Compatibility Validation

**Goal**: Validate the completed shared WebExtension implementation in desktop Chrome without forking browser behavior.

**Deliverables**:
- Load `dist/webextension/` as an unpacked extension in current stable desktop Chrome
- Confirm the emitted Manifest V3 extension installs without browser-specific rewriting
- Confirm Netflix-only host access and no background service worker (historical; superseded for onboarding only by Phase 12)
- Run the completed shared feature flow on live Netflix in a logged-in normal profile
- Validate route detection, series classification, UI injection, complete discovery, random playback, cancellation, cache behavior, and retryable errors
- Record any Chrome-specific incompatibility before introducing a browser adapter or runtime branch
- Keep all product logic shared; any required browser-specific runtime behavior needs a documented incompatibility, architecture update, and user approval

**Exit criteria**: The universal `dist/webextension/` build loads directly in desktop Chrome and passes the Chrome live smoke checklist with behavior equivalent to the Safari implementation. Any incompatibility is documented and resolved without an undocumented browser fork.

---

## Phase 8: Testing + Validation

**Goal**: Complete automated, packaging, CI, and cross-browser release validation.

**Approved sequencing exception**: Phase 8 automated tests, package assertions, and CI may be implemented while Phase 7 is blocked only on the user's authenticated Chrome smoke test. This does not waive or satisfy Phase 7. Phase 8 and release readiness remain incomplete until the pending live Chrome and final signed Safari checks are reported.

**Modules**:
- Vitest unit tests for selectors, detector, DOM utilities, parsing, normalization, randomization, and matching
- jsdom fixture integration tests for orchestration, custom-dropdown traversal, expansion, retries, cancellation, caching, feedback, and playback resolution
- Reusable Netflix desktop fixture builders for movie, implicit-season, and multi-season detail overlays
- Manual smoke testing on real Netflix in desktop Chrome and macOS Safari with logged-in normal profiles
- CI runs `npm test` and `npm run build` on all supported runners; a macOS job also runs `npm run safari:build`

**Exit criteria**: All unit and fixture integration tests pass, the universal build succeeds, the unsigned Safari Xcode wrapper build succeeds on macOS CI, and the live Netflix smoke checklist passes in desktop Chrome and macOS Safari. Kids profiles, iOS/iPadOS Safari, and automated live-Netflix E2E are out of scope.

---

## Phase 9: Multi-Provider Core Contract

**Goal**: Add provider identity and a single provider-runtime seam without changing Netflix behavior.

**Deliverables**:
- Provider-qualified `TitleContext`, `Episode`, `SeriesInfo`, and cache keys.
- Shared provider runtime contract selected by exact host.
- Netflix adapter delegating to the existing Netflix detector, observer, discovery, navigator, and `/watch/` confirmation.
- Shared orchestrator tests for provider selection, cache isolation, cancellation, complete catalogs, randomization, and provider playback confirmation.

**Exit criteria**: All existing Netflix tests pass unchanged in behavior; provider-qualified cache isolation and dispatch tests pass; no Prime DOM behavior is implemented in this phase.

---

## Phase 10: Prime Video Chrome Provider

**Status**: complete (2026-08-16)

**Goal**: Add random episode selection for authenticated Prime Video India desktop Brave/Chromium with English UI.

**Modules/specs**:
- Prime route/root detection and selectors.
- Prime complete eligible-catalog discovery.
- Prime episode identity and live matching.
- Prime native playback and URL-preserving player confirmation.
- Prime-specific placement through the shared button owner.

**Approved behavior**:
- Exact `www.primevideo.com` host scope only, with no broad Amazon permissions.
- Prime detail routes use opaque `/detail/<id>` identities.
- Season links navigate to season detail identities and replace the displayed catalog.
- Only rows with a native `episodes-playbutton` and no unavailable/`COMING SOON` marker are eligible.
- Discovery is complete-or-fail and never randomizes partial data.
- Playback waits for the matching `#dv-web-player` / `div[aria-label="Web Player"]` overlay and completed loading state; URL changes are not confirmation.
- Prime restart-from-beginning is excluded until separately observed and approved. **Update**: Prime restart was later observed and approved separately; the approved mechanism is `video.currentTime = 0` on the playing episode video, live-verified 2026-08-15. Netflix `M7375` does not apply to Prime. See `docs/module-specs/prime-video-playback.md`.

**Exit criteria**: Prime fixtures pass; manifest/package assertions pass; authenticated India/English live Brave smoke confirms movie exclusion, complete eligible discovery across supported seasons, repeated random rolls, safe native playback, player confirmation, cancellation, and teardown; the full Netflix suite remains green. Chrome stable validation follows the Brave smoke before release. **All exit criteria verified** (2026-08-16).

---

## Phase 11: Prime Cross-Browser and Release Validation

**Status**: complete (2026-08-16)

**Goal**: Validate Prime in Chrome and decide whether to expand Safari scope.

**Exit criteria**: Current desktop Chrome live smoke passes with behavior equivalent to Brave, Netflix regressions remain green, and Safari Prime is either separately validated against new approved evidence or remains explicitly deferred. **All exit criteria verified** (2026-08-16): Chrome stable smoke passed with behavior equivalent to Brave; Netflix regression green; Safari Prime remains explicitly deferred by user decision (2026-08-16) until enough requests or donations justify its cost.

---

## Phase 12: Install and Uninstall Onboarding Hooks

**Status**: complete (2026-09-14)

**Goal**: Send new users to a welcome page on install and offer a short exit survey on uninstall, without adding product logic to a background runtime.

**Deliverables**:
- `src/background.ts` as the only background runtime, registering `chrome.runtime.setUninstallURL` and handling `chrome.runtime.onInstalled`
- Install redirect to `https://episode-roulette.prakashsewani.com/thanks`, uninstall redirect to `https://episode-roulette.prakashsewani.com/uninstalled`
- No new extension permissions: `chrome.tabs.create` and `setUninstallURL` are both permission-free
- Feature detection for browsers without `setUninstallURL` (Safari) and non-fatal warning logging for either hook
- `scripts/assert-packaging.mjs` updated to require exactly the approved background declaration while keeping the zero-permission assertion
- Unit tests simulating the install and update events, the uninstall URL registration, the Safari path, and a rejected tab creation
- Both destinations hosted by the `episode-roulette-website` repository, whose SPA fallback and assets binding were repaired so the redirect targets load directly

**Exit criteria**: the emitted manifest declares exactly one background service worker and zero permissions; package assertions pass in both WebExtension and Safari modes; the install tab opens once on a fresh install; the uninstall URL is registered at worker startup and after install; onboarding failures never affect product behavior. **All exit criteria verified** (2026-09-14) except the live uninstall redirect, which only fires after a real uninstall of the published build.

---

## Phase 13: Failure Reporting

**Status**: in progress (2026-09-20)

**Goal**: Turn every user-facing failure into an actionable, reportable event. When discovery, traversal, or episode selection fails, the extension shows an error snackbar that carries a **Report** link, and that link opens a pre-filled form on the product website so provider DOM changes can be diagnosed from real user reports.

**Deliverables**:
- Stored procedure/flow is unchanged: no new permissions, no background responsibility, no new host access
- `src/report.ts` as the only owner of the report URL contract (`REPORT_BASE_URL`, error classification, extension version lookup, query-param construction)
- Stable report error codes: `discovery`, `no-episodes`, `playback-resolution`, `playback-timeout`, `unknown`
- `reason` populated from the existing `SeasonControllerFailureReason` union when a season-controller failure caused the discovery failure
- `seasonLabel` carried structurally from the failed season, not parsed out of an error message
- `PlaybackTimeoutError` as a typed distinction for the playback-confirmation timeout, replacing message-string matching
- `feedback.ts` error toasts support an optional action link; an error toast with an action persists until dismissed, replaced, or navigation-cleaned, and never appears on abort
- `styles.ts` owns the snackbar action and close-button CSS
- `content.ts` attaches the report action in every user-facing error branch after its existing current-context guard
- Website `episode-roulette-website`: a `/report` route whose form options are preselected from `code`, `reason`, `provider`, and `season`, a hidden-by-default disclosure of exactly what will be submitted, and a worker that stores the extended submission payload
- `PRIVACY.md` documents the user-initiated report payload

**Out of scope**: popup report affordance, series-name scraping, background-worker involvement, any new extension permission, and Chrome Web Store API v2 migration.

**Exit criteria**: Every user-facing error toast offers a working report link; the link opens a form with the failed operation's options already selected; a report submitted from that form is stored by the website; abort, non-series, and cache-recovery paths still show no report affordance; the full automated gate passes; the website is deployed and verified live before the extension tag is pushed. **Live click-through of the snackbar Report link from a real provider failure requires user confirmation** and cannot be forced on demand in automated tests.

---

## Notes

- **Stretch goals** (exclude-season controls, repeat prevention, keyboard shortcuts, or weighting) remain out of scope unless separately approved. **Prime restart-from-beginning is implemented and approved** (see `docs/module-specs/prime-video-playback.md`); it is no longer a stretch goal.
- **Approved dependencies/tools**: runtime/build dependencies listed in Phase 1, `vitest` and `jsdom` as development-only test dependencies, and Apple Xcode plus `safari-web-extension-converter` for Safari packaging.
- **Do not change architecture** without updating `docs/architecture.md` first.
- Prime phases are ordered after the completed Netflix phases; all implementation phases (1–12) are complete and Phase 13 (Failure Reporting) is in progress. Netflix regression remains mandatory for any future change.
- **Safari publishing is deferred by user decision (2026-08-16)** until enough requests or donations justify its cost. The Safari wrapper and `safari:sync`/`safari:build`/`safari:init` tooling remain intact and may be resumed when the user re-opens Safari scope; no Safari work is required for the Chrome Web Store release.
