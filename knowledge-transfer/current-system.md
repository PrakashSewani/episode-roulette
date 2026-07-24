# Current System

## System Shape

Episode Roulette is a content-script-only browser extension. `src/manifest.ts` registers `src/content.ts` on Netflix pages. The content script observes Netflix SPA navigation, finds the active title-details root, confirms episodic content, injects UI, and coordinates discovery and playback.

```text
Netflix page
  -> content.ts orchestration
     -> observer.ts reports neutral route/DOM changes
     -> detector.ts extracts identity and confirms episodic DOM
     -> button.ts and feedback.ts own extension UI
     -> season-traverser.ts discovers a complete catalog
        -> season-controller.ts interacts with Netflix seasons
        -> episode-collector.ts creates durable metadata
        -> episode-identity.ts parses row identity
     -> randomizer.ts selects one episode
     -> navigator.ts re-resolves and clicks the current live row
```

Chrome loads `dist/webextension/` directly. Safari wraps the byte-identical WebExtension output in the committed Xcode project under `safari/`.

## Runtime Entry

`src/content.ts` exports `start()` and `stop()` and invokes `start()` when the module loads.

`start()`:

1. Returns immediately if already started.
2. Injects extension styles.
3. Registers `pagehide` teardown.
4. Starts the SPA observer.
5. Receives an immediate neutral event for the current URL.

`stop()`:

1. Aborts and invalidates active work.
2. Stops route and DOM observation.
3. Removes button, spawn indicator, toast, and styles.
4. Clears timers and playback confirmation.
5. Clears the in-memory catalog cache.

Tests dynamically import `content.ts` after installing mocks because module evaluation starts the runtime.

## Title Lifecycle

### Route Recognition

The observer reports URL changes but does not interpret them. It detects changes through:

- Initial URL evaluation
- `popstate`
- `hashchange`
- A 500 ms `window.location.href` polling interval

Polling is required because Netflix can change `jbv` through SPA history updates without a native navigation event.

`detector.ts#getTitleContext()` interprets a Netflix URL:

1. Reject `/watch/` routes.
2. Use a numeric `jbv` value when present.
3. Otherwise use a numeric `/title/<id>` path.
4. Return no title context for other routes.

A title context is identity only. It does not classify the title as a movie or series.

### Context Replacement

For a new title identity, `content.ts`:

1. Aborts the prior operation context.
2. Increments the monotonically increasing generation.
3. Disconnects prior title observation.
4. Removes title-owned UI and feedback.
5. Creates a fresh `AbortController`.
6. Sets one absolute five-second detection deadline.
7. Begins active-root discovery.

The generation is a second stale-work defense after cancellation. An aborted promise can still have queued continuations, so every important side effect also verifies generation and title identity.

### Active Root Resolution

`content.ts` resolves the active title-details root itself because root selection is orchestration state, not a generic DOM query.

The algorithm:

1. Query every configured `TITLE_DETAILS_ROOT` fallback.
2. De-duplicate identical elements.
3. Keep connected candidates.
4. Keep visible candidates with non-zero layout boxes and visible computed style.
5. Require scoped Play-button or title-metadata structure.
6. Accept exactly one candidate.
7. Keep waiting when zero or multiple candidates remain.

The extension never chooses the first dialog when multiple title-like surfaces are visible.

While no root is resolved, `observer.ts` temporarily observes `document.body`. Once a root is accepted, it switches to scoped root observation and a narrow page-level liveness observer.

### Series Confirmation

`detector.ts#detectSeries()` queries only inside the supplied active root. It confirms a series when the root contains an episode selector with at least one valid episode row.

A valid episode row is:

- Matched through centralized selectors
- Connected
- Visible
- An `HTMLElement`
- Marked `role="button"`

A season control is not required. Episode rows without a supported dropdown are treated as one implicit season.

Movies simply remain unconfirmed until the detection deadline. This is expected behavior, not an error.

### Detection Deadline

One absolute five-second deadline covers root discovery, episodic rendering, and same-title root replacement. Mutations and root replacements do not reset it. Only a new title ID receives a new deadline.

On expiry, title observation stops without a button or user-facing error.

## Observation Boundaries

`observer.ts` owns observation mechanics, not product classification.

It uses:

- Route polling and history listeners for the full content-script lifetime
- Temporary body observation during root discovery
- Scoped title-root observation after resolution
- A page-level liveness observer that only checks connection and expected parent
- A 50 ms trailing debounce for DOM notifications
- Generation tags to suppress old DOM callbacks

`clearTitleObservation()` removes temporary and scoped observers but keeps route observation alive. `onStop()` removes everything.

## UI Lifecycle

After series confirmation:

1. `button.ts` immediately adds a disabled `Loading Episode Roulette...` spawn indicator to the active root.
2. It waits up to five seconds for the scoped Netflix Play button.
3. It removes the indicator.
4. It inserts one operational button immediately after Play.
5. The operational button starts in `ready` state.

Opening a series never traverses seasons. Discovery begins only on a valid user click.

Button states:

| State | Behavior |
|---|---|
| `ready` | Enabled and starts an operation |
| `loading` | Disabled for pointer, keyboard, and repeated activation |
| `error` | Enabled and starts a fresh retry |

`button.ts` owns button DOM and state. `feedback.ts` independently owns the single current toast and its timers. `styles.ts` owns all extension CSS.

## Click-to-Playback Flow

```text
ready/error click
  -> dismiss old toast
  -> set loading
  -> read complete catalog cache
     -> miss: discover all seasons, guard, then cache
     -> hit: use durable cached catalog
  -> guard current context
  -> select uniformly
  -> show five-second selection status
  -> re-resolve selected season and episode in live DOM
  -> guard current context
  -> synchronously click the row
  -> wait up to five seconds for /watch/
```

### Catalog Discovery

`season-traverser.ts` has no cache. It always performs uncached discovery and returns either a complete `SeriesInfo` or an error.

Initialization and each season are attempted sequentially. Each non-abort failure receives one retry with a new ten-second absolute attempt deadline. `AbortError` propagates immediately without retry.

For each season, the traversal:

1. Resolves the current episode selector.
2. Activates the requested season when explicit.
3. Uses the live selector returned after Netflix may replace the subtree.
4. Expands the episode section if needed.
5. Requires stable valid rows.
6. Requires exact declared count when available.
7. Converts rows into durable metadata.

If any season fails after retry, all accumulated results are discarded. Partial results are never randomized or cached.

### Season Strategies

The current Netflix implementation supports:

- An implicit season when valid rows exist without a supported dropdown
- Netflix's verified custom dropdown with toggle, menu, and menu items

Numeric season labels use keys such as `season 7`. Named labels use keys such as `label:phantom blood`. The implicit key is `implicit`.

Named labels are supported. Known non-season actions are excluded only through the documented denylist. English count parsing is a separate first-release constraint.

### Durable Identity

Discovery never stores DOM elements. An `Episode` records provider-local series ID, durable season identity, complete-season index, optional episode number, title, and discovered complete row count.

Playback must reactivate the selected season and re-resolve the selected row because Netflix replaces or mutates episode DOM while seasons switch.

Resolution order is:

1. Unique non-conflicted episode number plus normalized title
2. Unique normalized title
3. Stored index only when no stronger identity is usable and live count equals discovered count

Ambiguity fails safely. There is no title-URL fallback.

### Random Selection

`randomizer.ts` is pure. It selects `Math.floor(Math.random() * episodes.length)`.

- Every complete-catalog episode has equal probability.
- Every click is independent.
- Repeats are allowed.
- No selection or playback history exists.

### Playback and Confirmation

`navigator.ts` resolves exactly one current visible episode selector, reactivates and validates the season, uniquely resolves the row, checks cancellation, invokes the orchestrator's current-context assertion, and synchronously calls `.click()`.

There must be no asynchronous boundary between the final context assertion and `.click()`.

`content.ts`, not `navigator.ts`, confirms success by waiting for a route whose path begins `/watch/`. A five-second timeout becomes a retryable playback error.

## State Ownership

### `content.ts`

Owns:

- Started/stopped lifecycle
- Active title and root
- Generation and `AbortController`
- Detection deadline and timer
- Series-confirmed state
- Current button controller
- Complete-catalog cache
- Pending playback confirmation

Only `content.ts` may read, write, invalidate, or clear catalog entries.

### `observer.ts`

Owns:

- Route callback and last URL
- Polling and history listeners
- Temporary body observer
- Scoped root observer
- Liveness observer
- Debounce timer
- Observation generation

### `button.ts`

Owns:

- At most one placed extension button
- At most one pending spawn/injection operation
- Current button state and click handler

### `feedback.ts`

Owns:

- Current toast
- Dismiss and exit timers
- Token that prevents stale timers from removing newer feedback

Discovery, randomizer, identity, and navigator modules retain no catalog or playback history.

## Cache Policy

The cache is `Map<string, SeriesInfo>` keyed by Netflix title ID.

- Complete catalogs only
- No TTL
- Retained across overlay close and title changes
- Cleared by `stop()`, reload, or tab close
- Never persisted to extension storage, web storage, or a backend

If live playback proves cached metadata stale, `content.ts` invalidates only that title, performs one fresh complete discovery, independently selects again, and retries playback once. A second mismatch becomes a normal retryable error. There is no rediscovery loop.

## Error Boundaries

| Error | Meaning | Orchestrator action |
|---|---|---|
| `AbortError` | Expected cancellation | Silent exit |
| `DiscoveryIncompleteError` | A complete catalog could not be built | Error button and season-loading message |
| `NoEpisodesError` | Complete discovery produced no episodes | Error button and no-episodes message |
| `CacheValidationMismatchError` | Cached season identity/count is stale | Invalidate once and rediscover |
| `PlaybackResolutionError` | Current selected row cannot be safely opened | Error button and playback-resolution message |
| Unknown error | Unexpected operational failure | Log and show general retryable error |

User-visible message wording is authoritative in `docs/error-handling.md`.

## Non-Negotiable Invariants

1. Route identity never proves a series.
2. All Netflix selector strings remain centralized.
3. Generic DOM utilities remain Netflix-agnostic.
4. Root, menu, Play, season, and episode queries remain scoped.
5. Discovery starts only after user intent.
6. Randomization requires a complete catalog.
7. Partial catalogs are never returned or cached.
8. Durable metadata contains no DOM references.
9. Playback uniquely re-resolves current live DOM.
10. Missing or ambiguous matches never click.
11. Cancellation and generation guard every side effect.
12. The final native click is synchronous after the last guard.
13. Cache ownership remains in the orchestrator.
14. Selection remains uniform and history-free.
15. Chrome and Safari consume one shared runtime and manifest output.
16. No background runtime is added without a documented responsibility.
