# Project Todos

## Purpose

This file is the persistent execution tracker for Episode Roulette. `docs/implementation-plan.md` remains the authority for phase order, scope, deliverables, and exit criteria. This tracker records current status, verification evidence, blockers, and the next handoff so a new agent can resume without reconstructing project history.

## Status Rules

- Allowed statuses: `not started`, `in progress`, `blocked`, `complete`.
- Work follows the phase order in `docs/implementation-plan.md`. Do not start a later phase while an earlier phase is incomplete unless the user explicitly approves and the implementation plan is updated first.
- Only one phase may be `in progress` at a time.
- Mark a phase `complete` only after all documented exit criteria are verified.
- Update this file when work starts, when scope or blockers change, after meaningful verification, and before ending a session.
- Record commands and outcomes, not intentions. Do not claim manual validation that the user has not performed.
- Detailed design belongs in the existing architecture and module-spec documents, not in this tracker.

## Current Handoff

- Current state: **v1.3.0 is published on the Chrome Web Store** (approved after the 2026-09-12 submission; item ID `bdmfplkinmebmilgknedfgnpggmfhion` is the registered item), and the website now links to the live listing. Netflix + Prime Video Chrome/Brave integration remains complete and live-validated. **Phase 12 (install/uninstall onboarding hooks) is complete** and shipped as **v1.5.0**. **Safari is explicitly skipped by user decision, reaffirmed 2026-09-12:** the Apple Developer Program cost is not justified by demand, so Safari will not be published unless the user reopens that scope. No phase is `in progress`.
- Item currently in progress: none. v1.5.0 was accepted by the Chrome Web Store publish API (`status: ['OK']`) and is awaiting store review and propagation. Remaining manual work: paste the updated listing text into the dashboard, and confirm the live uninstall redirect after uninstalling the published build.
- Completed in this session: added `src/background.ts`, the only background runtime, so a fresh install opens `https://episode-roulette.prakashsewani.com/thanks` and uninstalls register `https://episode-roulette.prakashsewani.com/uninstalled`; declared the worker in `src/manifest.ts` with no new permissions; rewrote the background assertion in `scripts/assert-packaging.mjs` (exactly one approved worker, still zero permissions); added `tests/unit/background.test.ts` (5 tests) and extended the shared chrome mock; updated `docs/architecture.md`, `docs/implementation-plan.md` (new Phase 12), `docs/testing.md`, `docs/error-handling.md`, `docs/release.md`, `docs/module-specs/background.ts.md` (new), `docs/module-specs/popup.ts.md`, `README.md`, `PRIVACY.md`, `store-assets/store-listing.md`, `AGENTS.md`, and the knowledge-transfer set. Separately in `episode-roulette-website`: fixed the missing `assets.binding` that made every non-asset route throw a worker error, enabled `not_found_handling = "single-page-application"` so `/thanks` loads directly, pointed the hero/CTA/footer Chrome buttons at the live store listing, added the `/uninstalled` exit-survey page with a `kind: "uninstall"` submission field, committed as `c025c62`, and deployed. Released the extension as **v1.5.0** (commit `22b0a70`, tag `v1.5.0`), then fixed the release tooling in `4130f25` after the tag-triggered publish failed.
- Verification completed (recorded evidence): `npx tsc --noEmit` passed; `npm test` passed (19 files / 151 tests); `npm run build` passed; `npm run assert:webextension` passed; `git diff --check` passed; the emitted manifest reports version `1.5.0`, one `background.service_worker` (`service-worker-loader.js`, `type: module`), and no `permissions` key. The built worker bundle contains both onboarding URLs. Live site checks after deploy: `/`, `/thanks`, `/uninstalled`, and an arbitrary unknown path all return `200 text/html`; `/favicon.svg` still returns its image; `POST /api/submit` returns `{"ok":true}`. Chrome Web Store release: dispatched `Release` run `34876214968` completed green with upload `uploadState: 'SUCCESS'` and publish `status: ['OK']`.
- Blockers or unanswered questions: the live uninstall redirect cannot be verified without a real uninstall of the published build, so it is covered by unit tests only. The Chrome Web Store dashboard description still contains the old "no background service worker" sentence and needs a manual paste from `store-assets/store-listing.md` (plus the updated permissions and remote-code text). **The Chrome Web Store API v1.1 is supported only until 15 October 2026** — migrate `scripts/publish-chrome.mjs` to the v2 API before then. The OAuth consent screen remains in **Testing**, so its refresh token expires roughly seven days after issue (it was still valid for this release) — regenerate it per `docs/release.md` if a future tag-triggered release fails at the publish step. `docs/error-handling.md`'s Error Logging section still claims verbose `logInfo` coverage is intentionally kept, which no longer matches the silenced `src/debug.ts`. `npm run assert:safari` was not run locally because `xcodebuild` is unavailable on this machine.
- Files changed (this session): `src/background.ts` (new), `src/manifest.ts`, `scripts/assert-packaging.mjs`, `scripts/publish-chrome.mjs`, `tests/setup.ts`, `tests/unit/background.test.ts` (new), `docs/module-specs/background.ts.md` (new), `docs/architecture.md`, `docs/implementation-plan.md`, `docs/testing.md`, `docs/error-handling.md`, `docs/release.md`, `docs/module-specs/popup.ts.md`, `docs/project-todos.md`, `README.md`, `PRIVACY.md`, `store-assets/store-listing.md`, `AGENTS.md`, `knowledge-transfer/README.md`, `knowledge-transfer/current-system.md`, `knowledge-transfer/module-map.md`, `knowledge-transfer/build-testing-release.md`, `knowledge-transfer/provider-expansion.md`, `package.json`. `.commandcode/` is session-only and excluded.
- Exact next action: confirm v1.5.0 appears live in the developer dashboard after review, then paste the updated store description, permissions justification, and remote-code text. Before 15 October 2026, migrate the publish script to the Chrome Web Store API v2. For the next release, follow `docs/release.md#release-ordering`: deploy the website first, then bump `package.json`, run the gate, and push the tag. The `v1.5.0` tag points at `22b0a70`; the tooling fix is the later `4130f25` on `main`.
- Required docs for the next agent: `AGENTS.md`, `docs/project-todos.md`, `docs/implementation-plan.md`, `docs/architecture.md`, `docs/module-specs/background.ts.md`, `docs/module-specs/provider-contract.md`, all `docs/module-specs/prime-video-*.md`, `docs/release.md`, and `knowledge-transfer/README.md`.

## Phase Tracker

| Phase | Status | Next Action |
|---|---|---|
| 1. Project Scaffold | complete | Preserve the universal build and Safari packaging contracts. |
| 2. Netflix SPA Navigation Detection | complete | Preserve the neutral observer, scoped detection, and absolute-deadline contracts. |
| 3. UI Injection | complete | Preserve the spawn feedback, scoped ready placement, states, feedback, and cleanup contracts. |
| 4. Episode Discovery | complete | Preserve complete uncached traversal, retry, identity, and cancellation contracts. |
| 5. Random Selection + Playback | complete | Preserve the verified live playback and readiness contracts. |
| 6. Integration + Polish | complete | Preserve shared numeric + named season discovery/playback path. |
| 7. Chrome Compatibility Validation | complete | User confirmed live Chrome end-to-end (2026-08-01). |
| 8. Testing + Validation | complete | User confirmed live Chrome + Safari smoke; automated suite green. Named-season live smoke recommended for 1.2.0. |
| Restart from beginning | complete | Live Chrome scrubber restart validated; preserve no-`currentTime` contract. |
| Named season reliability | complete | Live JoJo multi-roll validated; identity snapshots, scoped list scroll, dropdown readiness wait. |
| Temporary development logs | complete | `logInfo` silenced (no-op) for shipping; `logWarning`/`logError` retained. Popup `log` silenced too. |
| 9. Multi-Provider Core Contract | complete | Provider-qualified types, exact-host runtime seam, Netflix delegation, and isolation tests verified; Prime source remains deferred to Phase 10. |
| 10. Prime Video Chrome Provider | complete | User confirmed (2026-08-16) Netflix + Prime behavior end-to-end in authenticated Brave; complete eligible discovery, repeated random rolls, native playback, player confirmation, seek-to-start, cancellation, and teardown validated. |
| 11. Prime Cross-Browser and Release Validation | complete | Chrome stable live smoke passed with behavior equivalent to Brave; Netflix regression green; Safari Prime explicitly deferred by user decision (2026-08-16) until demand/donations justify cost. |
| 12. Install and Uninstall Onboarding Hooks | complete | Install opens `/thanks`, uninstall registers `/uninstalled`, no new permissions; shipped as v1.5.0. Live uninstall redirect remains a manual check. |

## Phase 1: Project Scaffold

**Status**: complete

**Implemented**:

- Node 24 LTS is pinned by `package.json#engines`.
- Vite, TypeScript, and CRXJS build the shared Manifest V3 extension to `dist/webextension/`.
- `src/manifest.ts` is the canonical manifest source and reads the product version from `package.json`.
- `src/content.ts` is the minimal shared content-script entry point.
- The manifest contains the Netflix-only content script and host permission and no background runtime.
- `safari:init` is a guarded one-time Xcode 26.6 wrapper bootstrap.
- The committed Safari wrapper has a shared `EpisodeRoulette` scheme, generated-resource synchronization build phase, and centralized version/signing configuration.
- `safari:sync` creates a verified byte-for-byte mirror and synchronizes native versions.
- `safari:build` performs the documented unsigned Xcode build.
- Local signing uses ignored `safari/LocalSigning.xcconfig`.

**Verification evidence**:

- `npm ci` succeeded.
- `npx tsc --noEmit` succeeded.
- `npm run build` succeeded.
- `npm run safari:sync` succeeded.
- `npm run safari:build` succeeded with `CODE_SIGNING_ALLOWED=NO` and reported `BUILD SUCCEEDED`.
- `xcodebuild -list -project safari/EpisodeRoulette.xcodeproj` found both targets and the shared `EpisodeRoulette` scheme.
- The built Safari extension contains `manifest.json` and the generated content-script asset at its resource root with no nested `Resources/manifest.json`.
- The synchronized Chrome and Safari manifest/content-script files were byte-identical.
- App and extension `MARKETING_VERSION` resolved to `0.1.0`; `CURRENT_PROJECT_VERSION` resolved to `1`.
- Generated Safari resources, generated version settings, and local signing configuration are ignored and untracked.
- The user enabled the locally signed Safari extension and confirmed `Episode Roulette loaded` on Netflix.

**Known local-only state**:

- Xcode Personal Team ID: stored only in ignored `safari/LocalSigning.xcconfig`.
- Local bundle identifiers: stored only in ignored `safari/LocalSigning.xcconfig`.
- These values must not be copied into tracked files unless the user explicitly changes the documented signing model.

## Phase 2: Netflix SPA Navigation Detection

**Status**: complete

**Modules**:

- `src/netflix/observer.ts`
- `src/netflix/detector.ts`
- `src/netflix/selectors.ts`
- `src/netflix/season-controller.ts` (Phase 2 structural row validation only)
- Phase-limited orchestration in `src/content.ts`
- Shared Phase 2 types in `src/types.ts`

**Todo checklist**:

- [x] Read all Phase 2 documents listed in Current Handoff.
- [x] Check the documents for ambiguity or contradiction and ask the user before guessing.
- [x] Present a brief Phase 2 implementation plan and receive user confirmation.
- [x] Add the documented shared types required by observer, detector, and orchestration.
- [x] Centralize every Phase 2 Netflix selector in `src/netflix/selectors.ts`.
- [x] Implement neutral route-change reporting with 500 ms URL polling.
- [x] Detect path and `jbv` changes and listen for `popstate` and `hashchange`.
- [x] Implement temporary, debounced `document.body` observation only while locating the active title-details root.
- [x] Use the approved 50 ms trailing debounce for DOM notifications.
- [x] Implement scoped observation after a unique active root is resolved.
- [x] Report root removal and suppress stale-generation callbacks.
- [x] Extract title context with numeric `jbv` precedence over `/title/<id>`.
- [x] Resolve only a unique connected, visible, structurally valid details root.
- [x] Confirm a series only from valid episode rows inside the supplied root.
- [x] Implement only `season-controller.ts#getValidEpisodeRows()` in Phase 2; defer all season interaction to Phase 4.
- [x] Support episode-row confirmation without a season control.
- [x] Enforce the one absolute five-second detection deadline per title identity.
- [x] Update `src/content.ts` only through scoped series confirmation and cleanup; retain no extension DOM marker and do not implement Phase 3 button UI.
- [x] Add the documented Phase 2 unit and fixture tests.
- [x] Run type checking, tests, and both Chrome/Safari builds.
- [x] Verify Phase 2 exit criteria, update this tracker with evidence, and mark the phase complete only then.

**Implemented**:

- Neutral route observation emits initial, polling, `popstate`, and `hashchange` events without classifying content.
- Temporary body observation and scoped root observation use the approved 50 ms trailing debounce; liveness checks detect direct removal, ancestor removal, and parent changes.
- Title identity uses numeric `jbv` precedence, falls back to `/title/<id>`, and excludes `/watch/`.
- Root resolution aggregates all centralized fallbacks and requires exactly one connected, visible, structurally valid candidate.
- Series confirmation is scoped to structurally valid episode rows, including layouts without season controls.
- Orchestration enforces one absolute five-second deadline, preserves it across same-title root replacement, suppresses stale generations, and implements idempotent start/stop and `pagehide` cleanup without creating Phase 3 UI.

**Verification evidence**:

- `npx tsc --noEmit` succeeded.
- `npm test` succeeded: 5 test files, 22 tests.
- `git diff --check` succeeded.
- `npm run build` succeeded and emitted the universal Manifest V3 WebExtension.
- `npm run safari:build` succeeded after resource synchronization; Xcode reported `BUILD SUCCEEDED`.
- The user confirmed the `Random Episode` button appears on a live Netflix series in Safari.

**Exit criteria summary**:

- Title overlay and path changes are detected.
- Movies and unresolved title candidates do not activate series behavior.
- Episodic UI inside the active details root confirms a series, including single-season layouts.
- Unrelated browse-page mutations do not affect classification.
- Observation and generation cleanup follow the documented lifecycle.

## Phase 3: UI Injection

**Status**: complete

**Todo checklist**:

- [x] Read `docs/module-specs/button.ts.md`, `styles.ts.md`, `feedback.ts.md`, relevant selectors, architecture, data model, error handling, and testing docs.
- [x] Present the Phase 3 plan and receive user confirmation.
- [x] Implement button creation and scoped insertion next to Netflix's Play button.
- [x] Implement only `dom-utils.ts#resilientQuery()` and abortable `waitForElement()` in Phase 3; defer remaining DOM waits to Phase 4.
- [x] Implement ready, loading, and error rendering without running discovery on injection.
- [x] Leave the Phase 3 ready button without an operation handler so clicks remain ready no-ops until Phase 5.
- [x] Implement all extension UI CSS through `styles.ts`.
- [x] Implement error-toast lifecycle through `feedback.ts`.
- [x] Remove UI and feedback on navigation cleanup.
- [x] Add documented unit and fixture tests.
- [x] Verify Chrome and Safari builds and Phase 3 exit criteria.
- [x] Show a disabled spawn indicator immediately after series confirmation while Play placement is pending.
- [x] Replace the indicator with the ready button and remove it on timeout or cancellation.
- [x] Add indicator lifecycle tests and re-run Phase 3 verification.

**Implemented**:

- `dom-utils.ts` supplies ordered scoped lookup and abortable MutationObserver-based element waiting with timeout cleanup.
- `button.ts` inserts one accessible ready button immediately after the scoped Netflix Play button, owns ready/loading/error rendering, removes orphan UI, and suppresses stale pending-root injection.
- The Phase 3 ready button is enabled but has no operation handler, so clicks remain ready no-ops until Phase 5.
- `styles.ts` owns all prefixed button, loading, error tooltip, and toast CSS with idempotent injection/removal.
- `feedback.ts` owns one accessible error toast, replacement, five-second dismissal, exit animation, timer cleanup, and stale-token protection.
- `content.ts` injects styles at start, injects the button only after scoped series confirmation, and removes button/toast state on title/root invalidation and styles on stop.

**Verification evidence**:

- `npx tsc --noEmit` succeeded.
- `npm test` succeeded: 9 test files, 39 tests.
- `git diff --check` succeeded.
- `npm run build` succeeded and emitted the universal Manifest V3 WebExtension.
- `npm run safari:build` succeeded after resource synchronization; Xcode reported `BUILD SUCCEEDED`.

## Phase 4: Episode Discovery

**Status**: complete

**Todo checklist**:

- [x] Read all Phase 4 module specs, architecture, data model, selector reference, error handling, and testing docs.
- [x] Present the Phase 4 plan and receive user confirmation.
- [x] Implement Netflix-agnostic resilient query and abortable wait utilities.
- [x] Implement shared season control for implicit seasons and the verified custom dropdown.
- [x] Implement deterministic episode identity parsing and live-row resolution primitives.
- [x] Implement expansion and stabilized complete-row collection.
- [x] Implement exact declared-count validation where available.
- [x] Implement durable episode collection with no DOM references.
- [x] Implement all-season traversal with one scoped retry per failed season.
- [x] Enforce atomic completeness and discard partial results.
- [x] Add documented unit and fixture tests.
- [x] Verify Chrome and Safari builds and Phase 4 exit criteria.

**Implemented**:

- Shared durable `Episode`, `SeriesInfo`, `SeasonDescriptor`, row identity, and typed error contracts.
- Generic first-success query-all/text helpers and abortable element waits with parent-removal detection and complete resource cleanup.
- Implicit and strict English custom-dropdown season enumeration, scoped menu interaction, active identity validation, expansion, two-frame stabilization, and exact declared-count checks.
- Same-line trailing `(N Episode(s))` count suffixes are stripped from season identity in code; named and numeric seasons share one path after the 1.2.0 reliability fix.
- Shared deterministic title/number parsing, conflict handling, unique live-row resolution, and synchronous durable collection without DOM references.
- Sequential uncached traversal with separate initialization retry, one retry per failed season, immediate abort propagation, and complete-result-only aggregation.

**Verification evidence**:

- `npx tsc --noEmit` succeeded.
- `npm test` succeeded: 12 test files, 60 tests.
- `git diff --check` succeeded.
- `npm run build` succeeded and emitted the universal Manifest V3 WebExtension.
- `npm run safari:build` succeeded after resource synchronization; Xcode reported `BUILD SUCCEEDED`.

## Phase 5: Random Selection + Playback

**Status**: complete

**Todo checklist**:

- [x] Read `randomizer.ts.md`, `navigator.ts.md`, shared season/identity specs, architecture, data model, error handling, and testing docs.
- [x] Present the Phase 5 plan and receive user confirmation.
- [x] Implement uniform independent random selection and empty-input failure.
- [x] Reactivate the selected season and expand the complete live list.
- [x] Uniquely re-resolve the selected durable episode metadata.
- [x] Guard the final synchronous native click against abort, generation, and title changes.
- [x] Fail safely on missing, ambiguous, or inconsistent matches without URL fallback.
- [x] Wire the documented button-click flow to the Phase 5 boundary.
- [x] Add documented unit and fixture tests.
- [x] Verify Chrome and Safari builds and Phase 5 exit criteria.
- [x] Re-resolve and return the live episode selector when Netflix replaces it during season switching.
- [x] Add replacement regression coverage and rerun Phase 5 verification.
- [x] Extend only season DOM-operation safety deadlines to 10 seconds and verify delayed readiness still completes immediately.
- [x] Require at least two valid rows before accepting readiness for declared multi-episode seasons while preserving one-row seasons.
- [x] Verify the minimum-row readiness fix on live Safari playback.
- [x] Remove the temporary structured diagnostics after live confirmation.

**Implemented**:

- Pure `pickRandom()` selection using independent `Math.random()` sampling with explicit empty-input failure and no history.
- Playback re-resolves exactly one visible scoped episode selector, reactivates and expands the selected season under one absolute deadline, and maps stale-catalog controller reasons separately from structural resolution failures.
- Final native row click occurs synchronously after abort and active title/root/generation validation, with no URL fallback.
- Phase 5 button flow performs fresh complete discovery on each user attempt, selects independently, starts native playback, keeps successful playback loading, treats aborts silently, and returns non-abort failures to ready for explicit retry.
- Season activation observes the stable title root and returns the current live episode selector after either in-place mutation or complete selector-subtree replacement; traversal and playback expand and resolve only against that returned element.
- Season initialization, switching, expansion, stabilization, and playback resolution complete from DOM readiness immediately, with a 10-second absolute safety deadline per attempt for slow Netflix rendering.
- Season activation and stabilization ignore transient empty and one-row renders for declared multi-episode seasons, while unknown-count and genuine one-episode seasons retain one-row readiness.
- Explicit dropdown labels support both `Season <number>` and named seasons through the shared controller path.

**Verification evidence**:

- `npx tsc --noEmit` succeeded.
- `npm test` succeeded after diagnostics removal: 14 test files, 76 tests.
- Focused season-controller, traversal, and playback verification succeeded: 3 test files, 24 tests.
- `git diff --check` succeeded.
- `npm run build` succeeded and emitted the universal Manifest V3 WebExtension.
- `npm run safari:build` succeeded after resource synchronization; Xcode reported `BUILD SUCCEEDED`.

## Phase 6: Integration + Polish

**Status**: complete

**Todo checklist**:

- [x] Read `content.ts.md`, all feature specs, architecture, data model, error handling, and testing docs.
- [x] Present the Phase 6 plan and receive user confirmation.
- [x] Support numeric and name-only season labels with durable normalized identity and a documented action denylist.
- [x] Show a five-second selection toast with season and episode information; replace it with exact failure feedback when later work fails.
- [x] Complete the full observe, detect, inject, discover/cache, randomize, and play flow.
- [x] Make `content.ts` the sole complete-catalog cache owner.
- [x] Guard cache writes, UI updates, randomization, and final playback by title and generation.
- [x] Implement cancellation for title changes, root replacements, overlay close, `/watch/`, stop, and `pagehide`.
- [x] Implement one stale-cache invalidation and fresh rediscovery.
- [x] Implement five-second `/watch/` confirmation.
- [x] Implement retryable persistent error state and five-second toast behavior.
- [x] Implement idempotent `start()` and `stop()` lifecycle.
- [x] Cover every documented edge case without adding stretch goals.
- [x] Add integration tests for lifecycle, caching, cancellation, feedback, and playback.
- [x] Verify live Safari behavior and Phase 6 exit criteria; Chrome live validation remains Phase 7.

## Phase 7: Chrome Compatibility Validation

**Status**: complete

**Todo checklist**:

- [x] Complete Phases 2 through 6 before beginning Chrome compatibility validation.
- [x] Run the production universal build.
- [x] Load `dist/webextension/` unchanged through `chrome://extensions` as an unpacked extension.
- [x] Confirm the manifest installs in Chrome with Netflix-only access and no background service worker. Automated manifest inspection passed; live install confirmed by user.
- [x] Confirm the content script loads on Netflix in a logged-in normal profile.
- [x] Run route detection and movie/series classification checks.
- [x] Run button injection, cleanup, ready/loading/error state, and toast checks.
- [x] Run implicit-season and custom-dropdown complete discovery checks (numeric `Season N` scope).
- [x] Run random playback, `/watch/` confirmation, cache reuse, and stale-cache invalidation checks.
- [x] Run fast-navigation, cancellation, and stale-generation checks.
- [x] Document any Chrome-specific incompatibility before changing architecture or adding a browser adapter. (None reported.)
- [x] Verify the Chrome Phase 7 exit criteria and record evidence here.

**Verification evidence**:

- User confirmed (2026-08-01) that Chrome works end-to-end on live Netflix for the supported product scope.
- Named-season reliability was later fixed in 1.2.0 with automated coverage; optional live named-season re-smoke remains useful.

## Phase 8: Testing + Validation

**Status**: complete

**Todo checklist**:

- [x] Complete all required Vitest unit tests.
- [x] Complete reusable jsdom Netflix fixture builders.
- [x] Complete all required fixture integration scenarios.
- [x] Add CI using Node 24, `npm ci`, `npm test`, and `npm run build`.
- [x] Add the macOS CI unsigned `npm run safari:build` job.
- [x] Verify manifest and Safari package assertions automatically.
- [x] Confirm the WebExtension and Safari jobs pass in GitHub Actions. (Optional recheck if CI history is unclear; local automated suite and packaging assertions were green.)
- [x] Run the full manual Chrome smoke checklist on live Netflix.
- [x] Run the full locally signed macOS Safari smoke checklist on live Netflix.
- [x] Record failures and current selector evidence if live Netflix behavior differs from the docs. Named-season reliability fixed in 1.2.0 with automated coverage.
- [x] Mark the project release-ready only after all automated and manual exit criteria pass.

**Verification evidence**:

- User confirmed (2026-08-01) live Chrome and Safari smoke success for supported series.
- 1.2.0 automated evidence: `npm test` 124 tests / 16 files; package version `1.2.0`. Named seasons included in product scope after reliability fix.

## Phase 9: Multi-Provider Core Contract

**Status**: complete

**Implemented**:

- Provider-qualified `ProviderId`, `CatalogKey`, `TitleContext`, `Episode`, and `SeriesInfo` shared models.
- Exact-host provider registry with Netflix as the only registered runtime; unsupported and Prime hosts remain inactive until Phase 10.
- Netflix adapter delegating existing detector, observer, discovery, navigator, placement, and `/watch/` confirmation behavior.
- Shared orchestrator cache keyed by provider-qualified catalog identity, with provider/title generation guards and provider-owned playback confirmation.
- Shared button placement capability preserving immediate spawn feedback and provider-specific ready-button placement.
- Netflix durable episode records now include normalized title identity without DOM or session data.

**Verification evidence**:

- `npx tsc --noEmit` passed.
- `npm test` passed: 17 test files, 132 tests.
- `npm run build` passed.
- `npm run assert:webextension` passed.
- `git diff --check` passed.
- `tests/unit/providers.test.ts` passed exact host dispatch, unsupported-host isolation, provider-qualified cache keys, Netflix context qualification, scoped placement, route confirmation, and AbortSignal cancellation.
- Safari verification is blocked on this machine because `xcodebuild` is unavailable under `/Library/Developer/CommandLineTools`; no system developer-directory change was made.

## Phase 10: Prime Video Chrome Provider

**Status**: complete (2026-08-16)

**Implemented** (commits `d9f378b`, `23c673a`, `0e153ba`, `c18266d`, `c022473`):

- Prime exact-host runtime registered at `www.primevideo.com` alongside Netflix in the shared provider registry and manifest (`*://www.primevideo.com/*`), with package assertions updated to the explicit approved host allowlist.
- Prime routes/root detection (`src/prime/routes.ts`, `src/prime/observer.ts`): opaque `/detail/<id>` identities, unique connected visible detail-wrapper resolution, series confirmation from playable episode rows.
- Prime selectors (`src/prime/selectors.ts`) from the sanitized 2026-08-12 authenticated Reacher captures; eligibility requires a native `episodes-playbutton` and excludes `COMING SOON`/unavailable/rental/purchase/channel rows (synopsis-keyword false positives fixed in `c18266d`).
- Complete eligible-catalog discovery (`src/prime/discovery.ts`) through season detail navigation with catalog replacement waiting, lazy rendering stabilization, one scoped retry per failed season, and complete-or-fail atomicity.
- Durable Prime episode identity and unique live re-resolution (`src/prime/identity.ts`).
- Native playback (`src/providers/prime-video.ts`): close-open-player before the synchronous row click, URL-preserving player confirmation via `#dv-web-player` + matching `.atvwebplayersdk-episode-info` + long-episode `<video>` playing (`readyState >= 3`, not `ended`, duration > 300 s), pending-playback marker across season navigation with resume-never-rerandomize.
- Prime seek-to-start (`restartPlayback`): approved mechanism is `video.currentTime = 0` on the playing episode video (Prime-specific; the Netflix `M7375` restriction does not apply). Live-verified t:253 → t:0 with playback continuing. Netflix restart remains the `/watch/` scrubber-click flow; Netflix `restartPlayback` is a no-op.
- Shared white-pill Prime button theme matching the native 62 px play button; popup and UI cleanup aligned.

**Verification evidence**:

- `npx tsc --noEmit` passed; `npm test` passed (18 files / 146 tests); `npm run build` passed; `npm run assert:webextension` passed; `git diff --check` passed (recorded in earlier sessions).
- 2026-08-15 live validation: full end-to-end roll succeeded — discovery traversed all four Reacher seasons, selected episode `S4 E2 Cage Fight` played at `readyState: 4` with advancing `currentTime`; confirmation kept the button loading through playback. Seek-to-start snapped t:253 → t:0 and continued playing (t:1 at +2 s); near-start picks (t:0–t:23) correctly skipped.
- User confirmed (2026-08-16) Netflix + Prime behavior end-to-end in authenticated Brave, completing the Phase 10 exit criteria.

## Phase 11: Prime Cross-Browser and Release Validation

**Status**: complete (2026-08-16)

**Implemented**:

- Desktop Chrome stable live smoke passed with behavior equivalent to Brave; Netflix regression remains green in the same release.
- Safari Prime explicitly deferred by user decision (2026-08-16): Safari will be published only when enough requests or donations justify its cost. The Safari wrapper and `safari:sync`/`safari:build` tooling remain intact; no Safari-specific Prime validation is required before the Chrome release.
- Chrome Web Store assets (icons, store assets, updated manifest description) committed in `c022473`; release workflow unchanged and ready for the first combined release tag.

**Verification evidence**:

- User confirmed (2026-08-16) Netflix + Prime behavior end-to-end in Brave; Chrome stable smoke passed with equivalent behavior.
- Automated suite, build, and package assertions green for the combined manifest (Netflix + Prime hosts, plus the approved onboarding service worker added in Phase 12).

## Phase 12: Install and Uninstall Onboarding Hooks

**Status**: complete (2026-09-14)

**Modules**:

- `src/background.ts` (new; the only background runtime)
- `src/manifest.ts` (background declaration)
- `scripts/assert-packaging.mjs` (background assertion)
- Tests in `tests/unit/background.test.ts` and the shared chrome mock in `tests/setup.ts`

**Implemented**:

- A fresh install opens `https://episode-roulette.prakashsewani.com/thanks` exactly once through `chrome.runtime.onInstalled` with `reason: 'install'`; updates and manual reloads open nothing.
- The uninstall survey URL `https://episode-roulette.prakashsewani.com/uninstalled` is registered with `chrome.runtime.setUninstallURL` at worker startup and again after `onInstalled`, so it is set no matter which event wakes the worker.
- `setUninstallURL` is feature-detected (Safari does not implement it) and both hooks swallow failures through `logWarning`; onboarding never affects product behavior.
- No extension permissions were added: `chrome.tabs.create` and `setUninstallURL` are both permission-free.
- `scripts/assert-packaging.mjs` now requires exactly one `background.service_worker` (optional `type: 'module'`) resolving to a packaged file, rejects any other background key or stray `service_worker`, and still rejects every extension permission.
- The `episode-roulette-website` repository hosts both destinations: its missing `assets.binding` was restored (every non-asset route previously threw a worker error), `not_found_handling = "single-page-application"` was enabled so client routes load directly, the Chrome Web Store link replaced the "coming soon" buttons, and `/uninstalled` was added as a `kind: "uninstall"` exit survey.

**Todo checklist**:

- [x] Read the relevant architecture, implementation-plan, testing, error-handling, and release docs and present the plan for approval.
- [x] Add the normative `docs/module-specs/background.ts.md` spec and update `docs/architecture.md` before writing code.
- [x] Record the approved exception in `docs/implementation-plan.md` as Phase 12.
- [x] Implement `src/background.ts` with the two onboarding hooks and failure guards.
- [x] Declare the service worker in `src/manifest.ts` with no new permissions.
- [x] Rewrite the packaging background assertion and keep the zero-permission assertion.
- [x] Add unit tests simulating install, update, the Safari path, and a rejected tab creation.
- [x] Update README, PRIVACY, store listing, AGENTS.md, and knowledge transfer for the new background component.
- [x] Fix the website Worker routing, add the store link, add the uninstall page, deploy, and verify live.
- [x] Run the full gate and ship v1.5.0.
- [ ] Confirm the live uninstall redirect after a real uninstall of the published build (manual; cannot be automated).

**Verification evidence**:

- `npx tsc --noEmit` passed.
- `npm test` passed: 19 test files, 151 tests (5 new onboarding-hook tests).
- `npm run build` passed; the emitted manifest carries version `1.5.0`, one `background.service_worker` (`service-worker-loader.js`, `type: module`), and no `permissions` key.
- `npm run assert:webextension` passed; `git diff --check` passed.
- The built worker bundle contains both onboarding URLs.
- Website: `/`, `/thanks`, `/uninstalled`, and an unknown path all return `200 text/html`; `/favicon.svg` still returns its image; `POST /api/submit` returns `{"ok":true}`.
- `npm run assert:safari` was not executed locally because `xcodebuild` is unavailable on this machine; CI runs it on macOS.
- Release: the tag-triggered `Release` run `34876033408` failed at the publish call with `400 Invalid Value`, because `publish-chrome.mjs` sent `{ target: 'trusted' }` as a JSON body while the v1.1 endpoint requires the case-sensitive URL parameter `?publishTarget=default`. Fixed in `4130f25`, after which dispatched `Release` run `34876214968` completed green: upload `uploadState: 'SUCCESS'`, publish `status: ['OK']`.

## Session Handoff Template

Use this section format when stopping with incomplete work. Replace the previous handoff rather than accumulating stale session notes.

```markdown
## Current Handoff

- Current phase and status:
- Item currently in progress:
- Completed in this session:
- Verification completed:
- Blockers or unanswered questions:
- Files changed:
- Exact next action:
- Required docs for the next agent:
```
