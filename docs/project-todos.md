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

- Current state: **v1.6.0 is committed on `main` and ready to tag.** Phase 13 (Failure Reporting) is implemented and verified end-to-end against the deployed website: every user-facing error snackbar now carries a **Report** link into a new `/report` form whose options are pre-selected from the failure context. The website (`episode-roulette-website` commit `5d221e9`) is **deployed and live**. The `v1.5.0` package remains the published store version until the `v1.6.0` tag is pushed. **Safari is explicitly skipped by user decision, reaffirmed 2026-09-12:** the Apple Developer Program cost is not justified by demand.
- Item currently in progress: **Phase 13 — Failure Reporting**, release step only. Implementation, docs, website deploy, and live verification are finished; the phase stays `in progress` until the `v1.6.0` tag is pushed and the publish is confirmed, because that is one of its documented exit criteria.
- Completed in this session: **Phase 13.** Extension: added `src/report.ts` (report URL contract, error classification, version lookup); added the `discovery`/`no-episodes`/`playback-resolution`/`playback-timeout`/`unknown` code vocabulary and the `PlaybackTimeoutError` subclass that replaces message-string matching; gave `DiscoveryIncompleteError` structured `seasonLabel`/`reason` detail populated at the traverser and Prime discovery throw sites; made error toasts actionable and persistent in `feedback.ts`; added the snackbar action/close CSS to `styles.ts`; attached the report action in both `content.ts` error branches. Website: added the `/report` page with reason-over-code pre-selection, a context banner, an editable form, and a "What we'll send" disclosure; extended the worker payload and length-capped every stored field; added the footer link. Docs: Phase 13 in `docs/implementation-plan.md`; new `docs/module-specs/report.ts.md`; updated `docs/error-handling.md` (Failure Reporting section plus the stale Error Logging ship-gate claim), `docs/module-specs/{feedback,styles,content}.ts.md`, `docs/data-model.md`, `docs/architecture.md`, `docs/testing.md`, `docs/release.md`; updated `PRIVACY.md`, `README.md`, `store-assets/store-listing.md`, and `knowledge-transfer/{current-system,module-map,maintenance-playbook,build-testing-release}.md`.
- Verification completed (recorded evidence): `npx tsc --noEmit` passed; `npm test` passed (20 files / 168 tests, up from 19/151); `npm run build` passed; `npm run assert:webextension` passed; `git diff --check` passed. The emitted manifest reports version `1.6.0`, one `background.service_worker` (`service-worker-loader.js`, `type: module`), no `permissions` key, and the two approved hosts. The built content bundle contains `https://episode-roulette.prakashsewani.com/report`. Website: `npm run lint` (0 warnings, 0 errors) and `npm run build` passed, then `npm run deploy` published version `a18edfad-0768-4598-8240-8f1ea89643d2`. Live checks: `/`, `/thanks`, `/uninstalled`, `/report`, `/report?code=discovery&reason=render-timeout&provider=netflix&season=Season%204&titleId=81234567&v=1.6.0`, and an unknown path all return `200 text/html`. A `POST /api/submit` with the full error payload returned `{"ok":true}` and the record read back from KV contains every field. Browser-verified on the live URL with agent-browser: the page rendered "Episode Roulette hit a problem: **The season menu never appeared** on **Netflix** while loading **Season 4**", pre-selected that option from `reason=render-timeout`, pre-filled the season field with `Season 4`, and a real submission through the form stored `problem`, `series`, `season`, `code`, `reason`, `provider`, `titleId`, and `extensionVersion`.
- Blockers or unanswered questions: **`CHROME_REFRESH_TOKEN` must be regenerated before tagging.** `gh secret list` shows it last updated `2026-09-12T10:48:14Z`, and the OAuth consent screen is in **Testing**, so it expires roughly seven days after issue — it is already past that window. Regenerate it per `docs/release.md` and replace the secret, then push the tag. Also outstanding: the live click-through of the report link from a **real provider failure** in the packaged extension cannot be forced on demand, so it needs a user smoke check (the destination page, the payload, and the submission path are all verified; only the in-page click that opens it from a genuine failure is unproven). The live uninstall redirect still needs a real uninstall. The Chrome Web Store dashboard description still needs the manual paste from `store-assets/store-listing.md` (it now also needs the report-link wording). **The Chrome Web Store API v1.1 is supported only until 15 October 2026** — migrate `scripts/publish-chrome.mjs` to the v2 API before then. `npm run assert:safari` was not run locally because `xcodebuild` is unavailable on this machine.
- Files changed (this session): `src/report.ts` (new), `src/types.ts`, `src/content.ts`, `src/ui/feedback.ts`, `src/ui/styles.ts`, `src/discovery/season-traverser.ts`, `src/prime/discovery.ts`, `src/providers/netflix.ts`, `src/providers/prime-video.ts`, `tests/setup.ts`, `tests/unit/report.test.ts` (new), `tests/unit/feedback.test.ts`, `tests/unit/styles.test.ts`, `tests/integration/content-lifecycle.test.ts`, `package.json`, `PRIVACY.md`, `README.md`, `store-assets/store-listing.md`, `docs/implementation-plan.md`, `docs/project-todos.md`, `docs/error-handling.md`, `docs/data-model.md`, `docs/architecture.md`, `docs/testing.md`, `docs/release.md`, `docs/module-specs/report.ts.md` (new), `docs/module-specs/feedback.ts.md`, `docs/module-specs/styles.ts.md`, `docs/module-specs/content.ts.md`, `knowledge-transfer/current-system.md`, `knowledge-transfer/module-map.md`, `knowledge-transfer/maintenance-playbook.md`, `knowledge-transfer/build-testing-release.md`. Website repository: `src/pages/Report.tsx` (new), `src/App.tsx`, `src/App.css`, `src/components/Footer.tsx`, `src/components/Icon.tsx`, `src/data/content.ts`, `worker/index.ts`, `README.md`, committed as `5d221e9`. `.commandcode/` is session-only and excluded.
- Exact next action: regenerate `CHROME_REFRESH_TOKEN` (OAuth playground, offline access, scope `https://www.googleapis.com/auth/chromewebstore`) and set it with `gh secret set CHROME_REFRESH_TOKEN`, then `git push origin main` (if not already pushed) and `git tag v1.6.0 && git push origin v1.6.0`, and confirm the `Release` run reports upload `uploadState: 'SUCCESS'` and publish `status: ['OK']`. After the release, paste the updated store description, permissions justification, remote-code text, and promo tiles into the dashboard. Before 15 October 2026, migrate the publish script to the Chrome Web Store API v2.
- Required docs for the next agent: `AGENTS.md`, `docs/project-todos.md`, `docs/implementation-plan.md`, `docs/architecture.md`, `docs/error-handling.md`, `docs/module-specs/report.ts.md`, `docs/module-specs/feedback.ts.md`, `docs/module-specs/content.ts.md`, `docs/module-specs/background.ts.md`, `docs/release.md`, `PRIVACY.md`, and `knowledge-transfer/README.md`.

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
| 13. Failure Reporting | in progress | Implemented, documented, and verified live; website deployed (`5d221e9`). Remaining: regenerate `CHROME_REFRESH_TOKEN`, push `v1.6.0`, confirm the publish, and user smoke-check the snackbar Report link. |

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

## Phase 13: Failure Reporting

**Status**: in progress (2026-09-20)

**Modules**:

- `src/report.ts` (new; report URL contract and error classification)
- `src/ui/feedback.ts` (actionable error toasts)
- `src/ui/styles.ts` (snackbar action/close CSS)
- `src/content.ts` (report action dispatch)
- `src/types.ts` (`DiscoveryIncompleteError` detail, `PlaybackTimeoutError`)
- `src/discovery/season-traverser.ts`, `src/prime/discovery.ts`, `src/providers/*` (structured failure context)
- Website `episode-roulette-website`: `src/pages/Report.tsx`, `src/App.tsx`, `src/data/content.ts`, `src/App.css`, `src/components/Footer.tsx`, `worker/index.ts`

**Todo checklist**:

- [x] Read the relevant architecture, error-handling, module-spec, testing, release, and knowledge-transfer documents and present the design for approval.
- [x] Record the approved scope as Phase 13 in `docs/implementation-plan.md` and mark it in progress here.
- [x] Update the authoritative docs before code: `docs/error-handling.md`, `docs/module-specs/report.ts.md` (new), `docs/module-specs/feedback.ts.md`, `docs/module-specs/styles.ts.md`, `docs/module-specs/content.ts.md`, `docs/data-model.md`, `docs/architecture.md`, `docs/testing.md`, `docs/release.md`.
- [x] Update `PRIVACY.md`, `README.md`, `store-assets/store-listing.md`, and the knowledge-transfer set.
- [x] Add structured failure context to the error types and their throw sites.
- [x] Implement `src/report.ts` and its unit tests.
- [x] Make `feedback.ts` error toasts actionable and add the snackbar CSS.
- [x] Attach the report action in `content.ts`.
- [x] Build the website `/report` page, route, content data, styles, footer link, and worker payload fields.
- [x] Run the extension gate and the website lint/build.
- [x] Deploy the website and verify the live routes and a live submission.
- [ ] Bump `package.json` to `1.6.0` (done), push both repositories (website pushed as `5d221e9`), and tag `v1.6.0` after the refresh token is renewed.
- [ ] Confirm the tag-triggered `Release` run succeeds and the store accepts the upload.
- [ ] User smoke-check: click the snackbar Report link from a real provider failure in the packaged build.

**Verification evidence**:

- `npx tsc --noEmit` passed.
- `npm test` passed: 20 test files, 168 tests (three new feedback cases, eleven new report cases, and two new integration assertions over the report payload).
- `npm run build` passed; `npm run assert:webextension` passed; `git diff --check` passed.
- Emitted manifest: version `1.6.0`, one `background.service_worker` (`service-worker-loader.js`, `type: module`), no `permissions` key, hosts `*://*.netflix.com/*` and `*://www.primevideo.com/*`.
- Built `dist/webextension/assets/content.ts-*.js` contains `https://episode-roulette.prakashsewani.com/report`.
- Website: `npm run lint` reported 0 warnings and 0 errors; `npm run build` passed; `npm run deploy` published version `a18edfad-0768-4598-8240-8f1ea89643d2`.
- Live routes return `200 text/html`: `/`, `/thanks`, `/uninstalled`, `/report`, `/report?code=discovery&reason=render-timeout&provider=netflix&season=Season%204&titleId=81234567&v=1.6.0`, and an unknown path.
- `POST /api/submit` with the full error payload returned `{"ok":true}`; the KV record read back carries `problem`, `series`, `season`, `code`, `reason`, `provider`, `titleId`, and `extensionVersion`.
- Live browser check (agent-browser): the context banner rendered "Episode Roulette hit a problem: **The season menu never appeared** on **Netflix** while loading **Season 4**", the closest-match select was pre-selected from `reason=render-timeout`, the season field was pre-filled with `Season 4`, and submitting through the form produced the success state and a stored record.
- Not verified: the in-page snackbar Report click from a genuine provider failure (cannot be forced on demand), and the live uninstall redirect.

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
