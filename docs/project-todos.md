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

- Current state: **v1.3.0 pre-publish** — Prime Video Chrome provider validated end-to-end by the user (random rolls play episodes; seek-to-start implemented via `video.currentTime = 0`, live-verified). Development `logInfo` noise silenced for shipping; `logWarning`/`logError` retained. Named seasons + multi-roll remain live-validated on Netflix. Verbose `[Episode Roulette]` development logs **silenced**.
- Item currently in progress: Phase 10 Prime Video Chrome Provider — **seek-to-start implemented and verified**. Committed `23c673a` (playback confirmation/resume/theme fixes). Seek-to-start: observed the player live (no DOM seek bar/timeline — only a Volume slider; Prime ignores `t=0` URL variants and resumes at server-side saved offsets), updated `docs/module-specs/prime-video-playback.md` with the approved mechanism (assign `video.currentTime = 0` on the playing episode video, live-verified), implemented `restartPlayback` on the provider contract (Prime seeks; Netflix no-op), wired it after playback confirmation in both `selectAndPlay` and `resumePendingPlayback`, and added unit tests. **Uncommitted.**
- Completed in this session: Fixed the "toast shows but episode doesn't play" bug (definitive cause: the old-page confirmation waiter cleared the pending playback marker on season navigation, so the target page never clicked the episode row — fixed by `playEpisode`/`resumePendingPlayback` returning `Promise<boolean>` and skipping local confirmation when navigating to a season). Also fixed stuck-loading on player close, added Prime white-pill button theme matching the native 62px play button, and committed everything as `23c673a`. Then implemented Prime seek-to-start as described above.
- Verification completed: `npx tsc --noEmit`, `npm test` (18 files / 146 tests), `npm run build`, `npm run assert:webextension`, `git diff --check` all pass. Live: `video.currentTime = 0` on a playing episode video snapped t:253 → t:0 and continued playing (t:1 at +2s); full rolls played episodes and the restart skipped near-start picks correctly (S1 E1 stayed at t:0–t:23 advancing). Player-close returns button to ready; Prime theme matches native button.
- Blockers or unanswered questions: Live confirmation that a high-offset resume episode (e.g. S3 E1 at t=178) is seeked to 0 by the extension flow remains pending — random picks kept landing on S1 E1 (t=1). The `t=` URL trick does not work (Prime ignores it). The full roll takes ~40–60 s because discovery visits all seasons. Safari `npm run safari:build` blocked (`xcodebuild` unavailable under `/Library/Developer/CommandLineTools`).
- Files changed (committed `23c673a`): `src/content.ts`, `src/providers/prime-video.ts`, `src/providers/netflix.ts`, `src/prime/routes.ts`, `src/prime/selectors.ts`, `src/types.ts`, `src/ui/button.ts`, `src/ui/styles.ts`, `tests/fixtures/prime-video.ts`, `tests/unit/prime-provider.test.ts`, `docs/module-specs/prime-video-playback.md`, `docs/module-specs/prime-video-manual-validation.md`, `docs/selectors-reference.md`, `docs/project-todos.md`. Uncommitted since: `src/types.ts` (restartPlayback), `src/providers/prime-video.ts`, `src/providers/netflix.ts`, `src/content.ts`, `tests/unit/prime-provider.test.ts`, `docs/module-specs/prime-video-playback.md`, `docs/project-todos.md`. `.commandcode/` is session-only and excluded.
- Exact next action: Commit the seek-to-start work, then (when a roll picks a high-offset episode or via a controlled pick) confirm live that a resume episode seeks to 0 after the extension roll.
- Required docs for the next agent: `AGENTS.md`, `knowledge-transfer/provider-expansion.md`, `docs/architecture.md`, `docs/module-specs/provider-contract.md`, all `docs/module-specs/prime-video-*.md`, `docs/selectors-reference.md` Prime observation section, this tracker, and `docs/implementation-plan.md`.

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
| 10. Prime Video Chrome Provider | in progress | Prime foundation implemented; repeat authenticated Brave smoke and resolve the live player-ready gate before marking complete. |
| 11. Prime Cross-Browser and Release Validation | not started | Validate Chrome after Brave smoke; Safari Prime remains deferred unless separately approved. |

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
