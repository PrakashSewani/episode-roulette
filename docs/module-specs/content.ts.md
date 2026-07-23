# content.ts — Integration Orchestrator

## Purpose

Own the active Netflix title context and coordinate route observation, scoped DOM detection, UI injection, and cleanup. This module is the only owner of the end-to-end page lifecycle.

---

## API

```typescript
export function start(): void
export function stop(): void
```

`start()` and `stop()` are idempotent. The module calls `start()` from the content-script entry point and registers a `pagehide` listener that calls `stop()`. Tests and development/HMR may invoke them directly.

---

## Detection Lifecycle

```text
route-changed
    |
    v
extract TitleContext from `jbv` or `/title/<id>`
    |
    +-- no context --> disconnect observers, remove UI, stop
    |
    v
invalidate prior title operation context
    |
    v
locate TITLE_DETAILS_ROOT
    |
    +-- not rendered --> temporarily observe document.body and retry
    |
    v
observe the details root only
    |
    v
run detectSeries(context, root)
    |
    +-- unconfirmed --> re-run on scoped DOM changes until detection window ends
    |
    +-- series --> record confirmation; Phase 3 immediately shows disabled spawn feedback, then places the ready Random Episode button beside Play
```

The URL supplies title identity only. `content.ts` must never activate series behavior because a `/title/<id>` or `jbv` value exists by itself.

**Phase boundary**: Phase 2 implements this lifecycle through scoped series confirmation and cleanup only. Phase 3 adds styles, feedback ownership, and ready-button injection after confirmation. Phase 5 registers an uncached click handler that performs fresh complete discovery, independent random selection, and guarded native playback. Phase 6 adds cache ownership, typed user-facing error dispatch, stale-cache rediscovery, and `/watch/` confirmation.

## Detection Deadline

One five-second deadline starts when a new `TitleContext` becomes current. The same deadline covers:

- Waiting for a unique active title-details root
- Waiting for episodic UI within that root
- Replacing the root during initial Netflix rendering

DOM mutations and same-title root replacements re-run root resolution or scoped classification within the existing absolute deadline; they do not restart or extend it. On expiry, call `clearTitleObservation()` and treat that title context as non-series with no user-facing error. Only a new title ID starts a new deadline.

## Title Root Resolution

Resolve the active title-details root through this deterministic algorithm:

1. Iterate every selector string in `TITLE_DETAILS_ROOT.selectors` and query all candidates for each selector. Do not use first-success `resilientQueryAll()` for this operation.
2. De-duplicate identical elements.
3. Keep only elements where `isConnected` is true.
4. Keep only visible elements. A candidate is visible when it has non-zero layout boxes and computed `display` is not `none` and `visibility` is not `hidden`.
5. Require title-detail structure: the candidate must contain a scoped `PLAY_BUTTON` match or `TITLE_DETAILS_METADATA` match. Episodic UI is not required because movies also need a valid root for negative classification.
6. If exactly one valid candidate remains, use it.
7. If zero remain, continue root discovery until the current detection deadline.
8. If multiple remain, treat the root as unresolved and continue waiting. Never choose the first or newest candidate.

If Netflix later exposes a stable title ID on the details root, that attribute may be added as an additional centralized validation signal after live observation and documentation. The first release associates route identity to the unique visible validated root.

---

## Ownership

`content.ts` owns:

1. The current `TitleContext`
2. The current title-details root
3. The bounded detection window
4. Switching from temporary body observation to scoped root observation
5. Button and toast lifecycle
6. Invalidating work when title identity or root identity changes
7. Creating and aborting the active operation context
8. Guarding every side effect against stale generations
9. Coordinating cache invalidation and one-time rediscovery after live metadata mismatch
10. Sole ownership of the in-memory complete-catalog cache

Discovery success is atomic. The orchestrator may randomize and navigate only after `season-traverser.ts` returns a complete result. A failed discovery leaves no partial cache entry and transitions the button to a retryable error state.

`observer.ts` reports changes but does not classify content. `detector.ts` classifies a supplied DOM snapshot but does not wait, observe, inject UI, or retain state.

---

## Operation Context

```typescript
interface OperationContext {
  title: TitleContext
  generation: number
  controller: AbortController
  detectionDeadline: number
}
```

`content.ts` maintains a monotonically increasing generation counter. Starting a new title context performs these steps in order:

1. Abort the current controller, if any.
2. Increment the generation.
3. Remove old UI and disconnect old title-root observation.
4. Create the new context with a fresh `AbortController` and `detectionDeadline = performance.now() + 5000`.
5. Begin root discovery and classification for the new title.

Direct navigation from title A to title B is one atomic transition: A is invalidated before any B-specific observer, detector, or UI work starts.

When the active root is removed or changes parent for the same title, `content.ts` aborts the current controller, increments the generation, removes old UI, and resumes root discovery with a new `OperationContext` carrying the same `TitleContext` and copied `detectionDeadline`. If that deadline has expired, observation stops and no replacement cycle starts.

```typescript
function isCurrent(context: OperationContext): boolean {
  return !context.controller.signal.aborted
    && activeContext?.generation === context.generation
    && activeContext.title.titleId === context.title.titleId
}
```

Every async continuation returns without side effects when `isCurrent(context)` is false. Checks are mandatory immediately before:

- Injecting, removing, or changing button state
- Showing or dismissing feedback
- Writing discovery results to cache
- Random selection
- Calling playback resolution
- Clicking the final Netflix episode row

## Cache and Selection Flow

### Phase 5 Uncached Boundary

Before Phase 6 cache integration, each valid button click performs one fresh complete discovery, independently selects from the returned complete catalog, and calls playback resolution. The button changes to `loading` before discovery. Abort and stale-generation failures are silent. Any other failure is logged and returns the current button to `ready` so the user may explicitly retry. Phase 5 does not show an error toast, retain a catalog, invalidate stale metadata, or wait for `/watch/` confirmation.

### Phase 6 Complete Flow

`content.ts` owns:

```typescript
const catalogCache = new Map<string, SeriesInfo>()
```

No other module reads, writes, clears, or retains catalog entries.

On each valid button click:

1. Read the complete catalog for the active series ID, if present.
2. If absent, run complete discovery.
3. Verify the operation generation, active title ID, and abort state immediately before storing the complete returned catalog.
4. Call `pickRandom()` independently over the entire episode array.
5. Attempt live playback resolution.
6. If playback reports a cache-validation mismatch, clear only this series entry, run one fresh complete discovery, generation-guard its cache write, independently select again from the refreshed complete catalog, and retry playback once.
7. If the refreshed attempt fails, show the normal retryable error.

Error dispatch is exact:

- `CacheValidationMismatchError`: invalidate once and follow step 6
- `PlaybackResolutionError`: enter retryable error state without automatic rediscovery
- `DiscoveryIncompleteError`: error state and `Could not load all seasons. Try again.`
- `NoEpisodesError`: error state and `No episodes found`
- `AbortError`: exit silently
- Any other error: log diagnostics and show the general retryable error

The selected episode from the stale catalog is not preserved across rediscovery because it may no longer exist. A fresh independent selection maintains uniform randomness over the refreshed catalog.

No selected episode, playback result, or repeat-prevention state is retained after the operation.

## Button State Machine

```text
series confirmed -> disabled spawn indicator while Play placement is pending
Play resolved     -> ready operation button beside Play
spawn timeout     -> indicator removed, no user-facing error
ready click      -> loading
Phase 5 click success -> remain loading while Netflix handles native playback
Phase 5 non-abort failure -> ready for explicit retry
Phase 6 click success -> remain loading until /watch/
confirmation timeout  -> error + one 5-second toast
loading failure  -> error + one 5-second toast
error click      -> dismiss toast -> loading -> fresh attempt
any active state -> removed when title context is invalidated
```

`loading` is the only non-clickable state. `error` is persistent and retryable. An aborted operation performs no error transition and no toast update; cleanup or the new title context controls the visible UI.

After `navigator.ts` clicks the verified episode row, keep the button loading and wait up to 5 seconds for a route whose pathname begins `/watch/`. The route transition invalidates and removes the title UI through normal cleanup. If the same title-details context remains current after 5 seconds, enter the retryable error state with `Could not start playback. Try again.`

## Cleanup Rules

Cleanup occurs when:

- `jbv` changes or is removed
- The `/title/<id>` identity changes
- Netflix enters `/watch/`
- The active title-details root is removed or replaced
- The content script stops

Cleanup first aborts and increments the generation, then calls `observer.clearTitleObservation()` and removes extension UI and feedback. Route polling and history listeners remain active for the lifetime of the content script. Abort is expected control flow: it is logged only in debug mode and never produces an error toast.

`stop()` aborts the active context, increments the generation, calls `observer.onStop()`, removes the `pagehide` listener, removes all extension UI and feedback, calls `removeStyles()`, and clears the in-memory catalog cache. Normal tab close/reload also destroys the isolated world, but explicit shutdown is required for tests and HMR.

`start()` calls `injectStyles()` before starting observation. Repeated starts do not duplicate the style element.

---

## Detection Outcome

If episodic UI is confirmed, immediately show the disabled spawn indicator and begin scoped Play-button lookup. Replace it with the ready operation button when placement succeeds. If the five-second detection deadline ends without episodic UI, treat the title as non-series and do not show an error. Only a new title identity may begin a fresh cycle.

Button injection calls `injectButton(titleRoot, context.controller.signal)`. The function owns the temporary spawn indicator during its wait. A `null` result means the scoped Netflix Play button did not appear within 5 seconds and no UI is retained. An `AbortError` exits silently after indicator cleanup. Before storing the returned controller, `content.ts` calls `assertCurrent(context)`.

Discovery and playback receive the active context's `AbortSignal`. Their returned values are ignored unless the context is still current.

---

## Testing

- Integration test: Movie `jbv` context never injects the button
- Integration test: Series `jbv` context injects after scoped episodic UI appears
- Integration test: Confirmed series shows disabled spawn feedback until the scoped Play button appears
- Integration test: Episode-like browse content outside the details root is ignored
- Integration test: Hidden and disconnected dialog candidates are ignored
- Integration test: Multiple visible validated roots remain unresolved
- Integration test: Changing `jbv` cleans up the previous root and UI
- Integration test: Replacing the details root increments generation but preserves the original absolute deadline
- Integration test: Direct A to B navigation aborts A before starting B
- Integration test: A late result cannot update B's button or cache
- Integration test: Aborted work shows no user-facing error
- Integration test: Final episode click is guarded by generation, title ID, and abort state
- Integration test: Reopening a cached series avoids season traversal
- Integration test: Live metadata mismatch invalidates only that series and performs one fresh discovery
- Integration test: No selection or playback history is retained
- Integration test: Final click remains loading until `/watch/` and errors after 5 seconds if playback does not start
- Integration test: `start()`/`stop()` are idempotent and `pagehide` performs full cleanup
