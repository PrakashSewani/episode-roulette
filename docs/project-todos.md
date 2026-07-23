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

- Current state: Phase 1 is complete. Safari is the verified live development environment; Chrome compatibility validation is explicitly deferred to Phase 7.
- Next implementation phase: Phase 2, Netflix SPA Navigation Detection.
- Next agent must first read:
  - `AGENTS.md`
  - `docs/implementation-plan.md`, Phase 2
  - `docs/architecture.md`, especially route identity and scoped DOM observation
  - `docs/data-model.md`
  - `docs/module-specs/observer.ts.md`
  - `docs/module-specs/detector.ts.md`
  - `docs/module-specs/selectors.ts.md`
  - `docs/module-specs/content.ts.md` for the Phase 2 orchestration boundary
  - `docs/testing.md` for Phase 2 unit and fixture expectations
- Before writing Phase 2 code, the next agent must present a brief implementation plan and receive user confirmation as required by `AGENTS.md`.
- Do not begin Phase 3 UI work until Phase 2 exit criteria are met.

## Phase Tracker

| Phase | Status | Next Action |
|---|---|---|
| 1. Project Scaffold | complete | Preserve the universal build and Safari packaging contracts. |
| 2. Netflix SPA Navigation Detection | not started | Read the Phase 2 specs, resolve ambiguities, propose a plan, and wait for confirmation. |
| 3. UI Injection | not started | Start only after Phase 2 completion. |
| 4. Episode Discovery | not started | Start only after Phase 3 completion. |
| 5. Random Selection + Playback | not started | Start only after Phase 4 completion. |
| 6. Integration + Polish | not started | Start only after Phase 5 completion. |
| 7. Chrome Compatibility Validation | not started | Load the completed universal build in Chrome and run the live compatibility checklist. |
| 8. Testing + Validation | not started | Complete automated, CI, packaging, and final cross-browser release gates. |

## Phase 1: Project Scaffold

**Status**: complete

**Implemented**:

- Node 24 LTS is pinned by `.nvmrc` and `package.json#engines`.
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

**Status**: not started

**Modules**:

- `src/netflix/observer.ts`
- `src/netflix/detector.ts`
- `src/netflix/selectors.ts`
- Phase-limited orchestration in `src/content.ts`
- Shared Phase 2 types in `src/types.ts`

**Todo checklist**:

- [ ] Read all Phase 2 documents listed in Current Handoff.
- [ ] Check the documents for ambiguity or contradiction and ask the user before guessing.
- [ ] Present a brief Phase 2 implementation plan and receive user confirmation.
- [ ] Add the documented shared types required by observer, detector, and orchestration.
- [ ] Centralize every Phase 2 Netflix selector in `src/netflix/selectors.ts`.
- [ ] Implement neutral route-change reporting with 500 ms URL polling.
- [ ] Detect path and `jbv` changes and listen for `popstate` and `hashchange`.
- [ ] Implement temporary, debounced `document.body` observation only while locating the active title-details root.
- [ ] Implement scoped observation after a unique active root is resolved.
- [ ] Report root removal and suppress stale-generation callbacks.
- [ ] Extract title context with numeric `jbv` precedence over `/title/<id>`.
- [ ] Resolve only a unique connected, visible, structurally valid details root.
- [ ] Confirm a series only from valid episode rows inside the supplied root.
- [ ] Support episode-row confirmation without a season control.
- [ ] Enforce the one absolute five-second detection deadline per title identity.
- [ ] Update `src/content.ts` only to the Phase 2 orchestration boundary; do not implement Phase 3 button UI.
- [ ] Add the documented Phase 2 unit and fixture tests.
- [ ] Run type checking, tests, and both Chrome/Safari builds.
- [ ] Verify Phase 2 exit criteria, update this tracker with evidence, and mark the phase complete only then.

**Exit criteria summary**:

- Title overlay and path changes are detected.
- Movies and unresolved title candidates do not activate series behavior.
- Episodic UI inside the active details root confirms a series, including single-season layouts.
- Unrelated browse-page mutations do not affect classification.
- Observation and generation cleanup follow the documented lifecycle.

## Phase 3: UI Injection

**Status**: not started

**Todo checklist**:

- [ ] Read `docs/module-specs/button.ts.md`, `styles.ts.md`, `feedback.ts.md`, relevant selectors, architecture, data model, error handling, and testing docs.
- [ ] Present the Phase 3 plan and receive user confirmation.
- [ ] Implement button creation and scoped insertion next to Netflix's Play button.
- [ ] Implement ready, loading, and error rendering without running discovery on injection.
- [ ] Implement all extension UI CSS through `styles.ts`.
- [ ] Implement error-toast lifecycle through `feedback.ts`.
- [ ] Remove UI and feedback on navigation cleanup.
- [ ] Add documented unit and fixture tests.
- [ ] Verify Chrome and Safari builds and Phase 3 exit criteria.

## Phase 4: Episode Discovery

**Status**: not started

**Todo checklist**:

- [ ] Read all Phase 4 module specs, architecture, data model, selector reference, error handling, and testing docs.
- [ ] Present the Phase 4 plan and receive user confirmation.
- [ ] Implement Netflix-agnostic resilient query and abortable wait utilities.
- [ ] Implement shared season control for implicit seasons and the verified custom dropdown.
- [ ] Implement deterministic episode identity parsing and live-row resolution primitives.
- [ ] Implement expansion and stabilized complete-row collection.
- [ ] Implement exact declared-count validation where available.
- [ ] Implement durable episode collection with no DOM references.
- [ ] Implement all-season traversal with one scoped retry per failed season.
- [ ] Enforce atomic completeness and discard partial results.
- [ ] Add documented unit and fixture tests.
- [ ] Verify Chrome and Safari builds and Phase 4 exit criteria.

## Phase 5: Random Selection + Playback

**Status**: not started

**Todo checklist**:

- [ ] Read `randomizer.ts.md`, `navigator.ts.md`, shared season/identity specs, architecture, data model, error handling, and testing docs.
- [ ] Present the Phase 5 plan and receive user confirmation.
- [ ] Implement uniform independent random selection and empty-input failure.
- [ ] Reactivate the selected season and expand the complete live list.
- [ ] Uniquely re-resolve the selected durable episode metadata.
- [ ] Guard the final synchronous native click against abort, generation, and title changes.
- [ ] Fail safely on missing, ambiguous, or inconsistent matches without URL fallback.
- [ ] Wire the documented button-click flow to the Phase 5 boundary.
- [ ] Add documented unit and fixture tests.
- [ ] Verify Chrome and Safari builds and Phase 5 exit criteria.

## Phase 6: Integration + Polish

**Status**: not started

**Todo checklist**:

- [ ] Read `content.ts.md`, all feature specs, architecture, data model, error handling, and testing docs.
- [ ] Present the Phase 6 plan and receive user confirmation.
- [ ] Complete the full observe, detect, inject, discover/cache, randomize, and play flow.
- [ ] Make `content.ts` the sole complete-catalog cache owner.
- [ ] Guard cache writes, UI updates, randomization, and final playback by title and generation.
- [ ] Implement cancellation for title changes, root replacements, overlay close, `/watch/`, stop, and `pagehide`.
- [ ] Implement one stale-cache invalidation and fresh rediscovery.
- [ ] Implement five-second `/watch/` confirmation.
- [ ] Implement retryable persistent error state and five-second toast behavior.
- [ ] Implement idempotent `start()` and `stop()` lifecycle.
- [ ] Cover every documented edge case without adding stretch goals.
- [ ] Add integration tests for lifecycle, caching, cancellation, feedback, and playback.
- [ ] Verify Chrome and Safari builds and Phase 6 exit criteria.

## Phase 7: Chrome Compatibility Validation

**Status**: not started

**Todo checklist**:

- [ ] Complete Phases 2 through 6 before beginning Chrome compatibility validation.
- [ ] Run the production universal build.
- [ ] Load `dist/webextension/` unchanged through `chrome://extensions` as an unpacked extension.
- [ ] Confirm the manifest installs with Netflix-only access and no background service worker.
- [ ] Confirm the content script loads on Netflix in a logged-in normal profile.
- [ ] Run route detection and movie/series classification checks.
- [ ] Run button injection, cleanup, ready/loading/error state, and toast checks.
- [ ] Run implicit-season and custom-dropdown complete discovery checks.
- [ ] Run random playback, `/watch/` confirmation, cache reuse, and stale-cache invalidation checks.
- [ ] Run fast-navigation, cancellation, and stale-generation checks.
- [ ] Document any Chrome-specific incompatibility before changing architecture or adding a browser adapter.
- [ ] Verify the Chrome Phase 7 exit criteria and record evidence here.

## Phase 8: Testing + Validation

**Status**: not started

**Todo checklist**:

- [ ] Complete all required Vitest unit tests.
- [ ] Complete reusable jsdom Netflix fixture builders.
- [ ] Complete all required fixture integration scenarios.
- [ ] Add CI using Node 24, `npm ci`, `npm test`, and `npm run build`.
- [ ] Add the macOS CI unsigned `npm run safari:build` job.
- [ ] Verify manifest and Safari package assertions automatically.
- [ ] Run the full manual Chrome smoke checklist on live Netflix.
- [ ] Run the full locally signed macOS Safari smoke checklist on live Netflix.
- [ ] Record failures and current selector evidence if live Netflix behavior differs from the docs.
- [ ] Mark the project release-ready only after all automated and manual exit criteria pass.

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
