# Module Map

## Dependency Direction

```text
manifest.ts
  -> content.ts

content.ts
  -> providers/index.ts
  -> provider runtime (netflix.ts | prime-video.ts)
  -> button.ts / styles.ts / feedback.ts
  -> report.ts
  -> popup/popup.ts (via chrome.runtime.onMessage)
  -> season-traverser.ts
  -> randomizer.ts
  -> navigator.ts
  -> restart.ts

season-traverser.ts
  -> season-controller.ts
  -> episode-collector.ts

episode-collector.ts
  -> episode-identity.ts

prime-video.ts
  -> prime/routes.ts
  -> prime/observer.ts
  -> prime/selectors.ts
  -> prime/discovery.ts
  -> prime/identity.ts
  -> prime/pending.ts

navigator.ts
  -> season-controller.ts
  -> episode-identity.ts

shared modules
  -> types.ts
```

The practical high-risk centers are the triangles formed by `content.ts`, `season-controller.ts`, and `episode-identity.ts` (Netflix lifecycle correctness) and by `content.ts`, `prime-video.ts`, and the `prime/*` modules (Prime lifecycle correctness, player confirmation, and seek-to-start).

## Runtime Modules

### `src/providers/index.ts`, `src/providers/netflix.ts`, and `src/providers/prime-video.ts`

Role:

- Select a provider by exact host (`netflix.com`/`www.netflix.com` → Netflix; `www.primevideo.com` → Prime)
- Adapt provider-qualified contexts to the provider's own modules
- Own provider observer lifecycle, placement, discovery, native playback, playback confirmation, and restart delegation
- Both providers are registered and release-validated

High-risk changes:

- Matching broad hosts or unsupported routes
- Adding provider conditionals throughout shared modules
- Bypassing provider-qualified cache keys
- Losing abort or root-scoping guarantees during delegation

Primary tests:

- `tests/unit/providers.test.ts`
- `tests/unit/prime-provider.test.ts`

### `src/manifest.ts`

Role:

- Canonical Manifest V3 source
- Reads product version from `package.json`
- Declares the approved host allowlist (`*://*.netflix.com/*`, `*://www.primevideo.com/*`) and content-script matching
- Registers `src/content.ts`
- Registers the approved onboarding service worker `src/background.ts` (no other background key, no permissions)

Must not gain:

- A service worker beyond the approved onboarding worker
- Broad hosts such as `<all_urls>`
- Permissions unrelated to a documented runtime need

Change impact:

- Chrome installation contract
- Safari mirrored permissions
- Packaging assertions
- Manual site-access validation
- Future provider host model

### `src/background.ts`

Role:

- The only background runtime: an onboarding hooks service worker
- Registers the uninstall survey URL with `chrome.runtime.setUninstallURL` at startup and after `onInstalled`
- Opens `https://episode-roulette.prakashsewani.com/thanks` once when `onInstalled` reports `reason: 'install'`
- Holds no product logic and requests no permissions

Must not gain:

- Product behavior, page observation, discovery, cache, or messaging
- Storage, network requests, or extension permissions
- Any additional background event handling

Change impact:

- Install and uninstall onboarding URLs must stay in step with the deployed website
- Packaging background assertions in `scripts/assert-packaging.mjs`
- Privacy policy and store listing wording (the extension now has a background component)

### `src/content.ts`

Role:

- Content-script entry and sole lifecycle orchestrator
- Active context, root, generation, cancellation, UI, cache, errors, and playback confirmation

Public API:

```typescript
start(): void
stop(): void
```

Critical collaborators:

- Observer for neutral events
- Detector for identity and classification
- Button/feedback/styles for UI
- Traverser for complete catalog discovery
- Randomizer for independent selection
- Navigator for safe native playback
- Restart for post-`/watch/` seek-to-beginning

High-risk changes:

- Altering invalidation order
- Resetting detection deadlines
- Writing cache before current-context checks
- Showing feedback from aborted work
- Retrying stale catalogs more than once
- Adding an async boundary before final click indirectly through navigator contracts

Primary tests:

- `tests/integration/content-lifecycle.test.ts`

Authoritative spec:

- `docs/module-specs/content.ts.md`

### `src/types.ts`

Role:

- Shared durable models
- Operation and page event types
- Typed failure classes

Important types:

- `Episode`
- `SeriesInfo`
- `SeasonDescriptor`
- `EpisodeRowIdentity`
- `TitleContext`
- `OperationContext`
- `PageChangeEvent`
- `ButtonState`

High-risk changes:

- Adding DOM references to durable data
- Treating `discoveredAt` as TTL without approved policy
- Adding provider fields before multi-provider architecture is approved
- Changing error categories without updating orchestrator dispatch and tests

Authority:

- `docs/data-model.md`

### `src/report.ts`

Role:

- Sole owner of the failure-report contract: destination URL, error-code vocabulary, and error→query-param mapping
- Pure: no DOM, timers, storage, messaging, or network access
- Reads the extension version through `chrome.runtime.getManifest()`

Public API:

```typescript
REPORT_BASE_URL: string
classifyError(error: unknown): ErrorClassification
getExtensionVersion(): string | null
buildReportUrl(context: ReportContext): string
```

Must not gain:

- DOM or UI work (the toast renders the link; this module only builds it)
- Report-destination hosts in the manifest (the link is a plain anchor, not a permission)
- Message-string parsing to classify an error
- Any payload beyond the documented identifiers

Change impact:

- `REPORT_BASE_URL` must stay in step with the website `/report` route and the deployed form
- `docs/error-handling.md` documents the code vocabulary; `docs/module-specs/report.ts.md` is normative
- Privacy policy and store listing describe the payload

Primary tests:

- `tests/unit/report.test.ts`

## Netflix Boundary

### `src/netflix/observer.ts`

Role:

- Neutral URL and DOM event reporting
- Route polling, history events, temporary body observation, scoped root observation, and root liveness

It intentionally does not parse title IDs or classify content.

Public API:

```typescript
onStart(callback): void
observeForTitleRoot(generation): void
observeTitleRoot(root, generation): void
clearTitleObservation(): void
onStop(): void
```

High-risk changes:

- Stopping route polling during `clearTitleObservation()`
- Running selectors in the liveness observer
- Delivering stale debounced events
- Missing ancestor removal or parent changes
- Replacing the required polling strategy with event-only navigation detection

Primary tests:

- `tests/unit/observer.test.ts`

### `src/netflix/detector.ts`

Role:

- Parse Netflix title identity
- Exclude playback routes
- Confirm episodic DOM inside a supplied root

It does not wait, observe, resolve the active root, or inject UI.

High-risk changes:

- Classifying a URL as a series
- Querying outside the supplied root
- Requiring a season control for single-season content
- Weakening numeric `jbv` validation or precedence

Primary tests:

- `tests/unit/detector.test.ts`

### `src/netflix/selectors.ts`

Role:

- Sole implementation source for Netflix selector strings
- Ordered fallback data only

It must not contain query logic, parsing, waits, or interactions.

Change impact:

- Root detection
- Movie/series classification
- Button placement
- Season enumeration and expansion
- Episode parsing and playback

Required process:

1. Record dated live evidence.
2. Update `docs/selectors-reference.md`.
3. Update the normative selector spec.
4. Update implementation.
5. Run all affected unit, fixture, build, and live checks.

### `src/netflix/dom-utils.ts`

Role:

- Generic first-success queries
- Generic text extraction
- Generic element visibility predicate
- Abortable element waits
- Observer, timer, and listener cleanup

Although currently located under `netflix/`, its behavior is provider-neutral. It must not import Netflix selectors or encode season, episode, or UI semantics.

High-risk changes:

- Leaking observers or timers
- Swallowing `AbortError`
- Querying a broader root than supplied
- Adding provider-specific behavior for convenience

Primary tests:

- `tests/unit/dom-utils.test.ts`

### `src/netflix/season-controller.ts`

Role:

- Structural valid-row predicate
- Implicit/dropdown strategy recognition
- Season label and count parsing
- Season enumeration
- Active-season identification
- Season activation and selector replacement handling
- Expansion, stability, and count validation

Public APIs are shared by detector, traverser, and navigator. This keeps discovery and playback on one Netflix interaction contract.

High-risk changes:

- Retaining dropdown items across menu close/reopen
- Returning the pre-switch episode selector after Netflix replaces it
- Accepting a transient one-row render for a declared multi-episode season
- Using DOM node identity instead of row identity snapshots
- Resetting the caller-owned deadline
- Treating arbitrary dropdown actions as seasons or silently ignoring unknown actions
- Weakening exact expected-count checks

Primary tests:

- `tests/unit/season-controller.test.ts`
- `tests/integration/season-traversal.test.ts`
- `tests/unit/navigator.test.ts`

### `src/netflix/episode-identity.ts`

Role:

- Normalize episode titles
- Parse all configured episode-number sources
- Detect number conflicts
- Create transient live-row identity
- Uniquely resolve durable episode metadata

High-risk changes:

- Using different parsing in discovery and playback
- Removing punctuation during normalization
- Stopping at the first number selector and hiding conflicts
- Falling back to index after a stronger tier is ambiguous
- Allowing index fallback when live count differs

Primary tests:

- `tests/unit/episode-identity.test.ts`
- `tests/unit/episode-collector.test.ts`
- `tests/unit/navigator.test.ts`

## Prime Boundary

### `src/prime/routes.ts`

Role:

- Prime URL identity: a `/detail/<opaque-id>` path identifies a title/season candidate
- Detail-root resolution: unique connected visible `[data-testid="DVWebNode-detail-wrapper"]` containing `main[data-testid="detailpage-main"]`
- Series confirmation from playable rows inside the root

High-risk changes:

- Treating referral query parameters as identity
- Accepting ambiguous roots
- Confirming a series from non-playable rows

Primary tests:

- `tests/unit/prime-provider.test.ts` and Prime fixture tests

### `src/prime/selectors.ts`

Role:

- Sole implementation source for Prime selector strings
- Ordered fallback data only

It must not contain query logic, parsing, waits, or interactions. Prime selectors must never be added to `src/netflix/selectors.ts`.

### `src/prime/discovery.ts`

Role:

- Complete eligible-catalog discovery through Prime season detail navigation
- Wait for catalog replacement after season navigation
- Exclude `COMING SOON`, unavailable, rental, purchase, and unapproved-channel rows
- One scoped retry per failed season and atomic complete-or-fail

Primary tests:

- Prime fixture discovery tests

### `src/prime/identity.ts`

Role:

- Parse Prime episode number/title from rows
- Durable episode metadata without DOM references
- Uniquely re-resolve the selected episode in live DOM

### `src/prime/pending.ts`

Role:

- Short-lived pending-playback marker (opaque detail ID, episode number, normalized title, expiry)
- Survives season navigation; resume-never-rerandomize
- Cleared after confirmation, timeout, or detail mismatch; never a catalog/history record

### `src/providers/prime-video.ts`

Role:

- Prime provider adapter: route identity, root resolution, series detection, observation, discovery, native playback, player confirmation, seek-to-start restart, placement, and pending-playback resume

High-risk changes:

- Confirming via a route predicate (Prime preserves the detail URL)
- Not closing an open player before the episode-row click (trailer-preview bug)
- Using the permanent loading overlay as a readiness signal
- Reusing Netflix timeline selectors on Prime

Primary tests:

- `tests/unit/prime-provider.test.ts`

## Discovery Modules

### `src/discovery/season-traverser.ts`

Role:

- Complete uncached catalog discovery
- Sequential season processing
- Initialization and per-season retry
- Atomic aggregation

Public API:

```typescript
discoverEpisodes(seriesId, root, signal): Promise<SeriesInfo>
```

It does not own cache, randomization, UI, or playback.

High-risk changes:

- Processing seasons in parallel against one mutable Netflix UI
- Retrying `AbortError`
- Exposing partial results
- Reusing a deadline across retries
- Importing cache state

Primary tests:

- `tests/integration/season-traversal.test.ts`

### `src/discovery/episode-collector.ts`

Role:

- Synchronously transform supplied validated complete rows into durable `Episode[]`
- Delegate row parsing to shared episode identity logic

It does not query the page or validate row completeness.

High-risk changes:

- Retaining `HTMLElement` references
- Inventing episode URLs
- Re-filtering rows differently from the controller
- Computing indices before complete expansion

Primary tests:

- `tests/unit/episode-collector.test.ts`

## Engine Modules

### `src/engine/randomizer.ts`

Role:

- Pure uniform independent selection

This is the cleanest provider-neutral product module.

Must not gain:

- History
- Repeat prevention
- Weighting
- Cache access
- DOM or provider dependencies

Primary tests:

- `tests/unit/randomizer.test.ts`

### `src/engine/navigator.ts`

Role:

- Re-resolve the live episode selector
- Reconstruct and reactivate selected season identity
- Expand and validate live rows
- Uniquely resolve the selected row
- Translate controller failures
- Perform the final guarded native click

It does not own catalog rediscovery, cache, UI, or `/watch/` confirmation.

High-risk changes:

- Querying the full document instead of the active root
- Accepting multiple episode selectors
- Retaining stale rows across season activation
- Adding a URL fallback
- Catching cancellation as a product failure
- Awaiting anything after `assertCurrent()` and before `.click()`

Primary tests:

- `tests/unit/navigator.test.ts`

### `src/engine/restart.ts`

Role:

- After a random roll reaches `/watch/`, restart near the episode start
- Wait for settle, then click the player timeline scrubber at the absolute left edge
- Optionally one delayed scrubber retry if still mid-episode
- Abort cleanly on navigation away or `stop()`

Must not gain:

- UI or toast behavior
- Cache or history access
- Title context dependency (it only needs an abort signal)
- Direct `video.currentTime` assignment (live M7375)

Primary tests:

- `tests/unit/restart.test.ts`

## UI Modules

### `src/ui/button.ts`

Role:

- Create spawn and operational button DOM
- Wait for scoped Netflix Play placement
- Own ready/loading/error rendering and click suppression
- Prevent stale pending injection from replacing newer UI

It does not discover episodes, select, play, cache, or show toasts.

Primary tests:

- `tests/unit/button.test.ts`

### `src/ui/feedback.ts`

Role:

- Own exactly one status or error toast
- Render an optional action link (the failure report) and an optional close button
- Keep an action-carrying error toast on screen until the user acts or navigation cleanup runs
- Replace old feedback
- Manage dismissal and exit timers
- Prevent stale timers from removing newer feedback

It does not set button state and does not build report URLs; it renders the `href` it is handed.

Primary tests:

- `tests/unit/feedback.test.ts`

### `src/ui/styles.ts`

Role:

- Idempotently inject and remove all extension CSS

It must not modify global Netflix styles. Extension selectors and classes remain prefixed.

Primary tests:

- `tests/unit/styles.test.ts`

### `src/popup/popup.ts`

Role:

- Toolbar popup status display and roll trigger
- Query active tab for series status via `chrome.tabs.sendMessage`
- Send `roll` message to trigger the same playback flow as the in-page button
- Stateless view; no discovery, selection, playback, or cache ownership

Public API:

```typescript
(none — HTML entry point loaded by the browser action)
```

High-risk changes:

- Bypassing the content script to perform discovery directly
- Retaining state across popup open/close cycles
- Adding permissions not declared in the manifest

Primary tests:

- `tests/unit/popup.test.ts`

## Build and Packaging Modules

### `vite.config.ts`

- Builds one CRXJS Manifest V3 output to `dist/webextension/`
- Targets ES2020
- Clears the output directory

### `vitest.config.ts`

- Runs tests in jsdom
- Loads shared test setup

### `scripts/assert-packaging.mjs`

- Validates manifest permissions, the approved background declaration, version, and resources
- Validates exact Safari mirror and built `.appex` resources
- Validates generated Safari outputs are ignored and untracked
- Rejects duplicated product source in the Safari wrapper

The assertion commands assume the corresponding build has already run.

### `scripts/safari-sync.mjs`

- Runs after the universal build
- Creates and verifies a complete resource mirror
- Promotes resources with backup/restore behavior
- Writes generated native version configuration

### `scripts/safari-build.mjs`

- Runs the shared Xcode scheme with signing disabled

### `scripts/safari-init.mjs`

- Guarded one-time wrapper bootstrap
- Not part of ordinary development or CI
- Exact converter/Xcode assumptions are documented in `docs/safari.md`

### `.github/workflows/ci.yml`

- Ubuntu job validates tests and the universal WebExtension
- macOS job additionally builds and validates the unsigned Safari wrapper

Read `knowledge-transfer/build-testing-release.md` before changing any of these files.

## Test Map

| Area | Primary coverage |
|---|---|
| Route and observation | `tests/unit/observer.test.ts` |
| Identity and classification | `tests/unit/detector.test.ts` |
| Selector contract | `tests/unit/selectors.test.ts` |
| Generic DOM waits | `tests/unit/dom-utils.test.ts` |
| Season behavior | `tests/unit/season-controller.test.ts` |
| Episode identity | `tests/unit/episode-identity.test.ts` |
| Durable collection | `tests/unit/episode-collector.test.ts` |
| Button lifecycle | `tests/unit/button.test.ts` |
| Toast lifecycle | `tests/unit/feedback.test.ts` |
| Failure reporting contract | `tests/unit/report.test.ts` |
| CSS ownership | `tests/unit/styles.test.ts` |
| Uniform selection | `tests/unit/randomizer.test.ts` |
| Playback resolution | `tests/unit/navigator.test.ts` |
| Restart from beginning | `tests/unit/restart.test.ts` |
| Full orchestration | `tests/integration/content-lifecycle.test.ts` |
| Real controller/traversal integration | `tests/integration/season-traversal.test.ts` |
| Provider dispatch and cache isolation | `tests/unit/providers.test.ts` |
| Prime provider (routes, discovery, playback, confirmation, restart) | `tests/unit/prime-provider.test.ts` |

`tests/setup.ts` makes connected test elements visible by default because jsdom has no real layout boxes. Do not remove that behavior without accounting for production visibility checks.
