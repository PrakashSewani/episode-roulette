# season-traverser.ts — Episode Discovery

## Purpose

Discover all playable episodes across all seasons of the current TV series by traversing Netflix's UI.

---

## Responsibilities

1. Locate Netflix's episode selector
2. Select the first supported season-control strategy
3. For a page without a season control, collect its episode list as one implicit season
4. Otherwise, enumerate and activate each explicit season through the selected strategy
5. Wait for DOM to update with that season's episodes
6. Expand Netflix's truncated episode section until complete
7. Delegate episode parsing to `episode-collector.ts`
8. Aggregate episodes across all seasons
9. Retry any failed season attempt once
10. Return results only when every enumerated season succeeds

---

## Discovery Flow

```
1. Resolve `EPISODE_SELECTOR` within the supplied title root and inspect supported controls inside it
2. If episode rows exist and no season controls exist:
   a. Create one implicit season descriptor
    b. Create one absolute deadline 10 seconds in the future
   c. Expand and validate the episode section
   d. Collect the complete rendered episode set
    e. On failure, re-query and retry once with one new 10-second deadline
3. Otherwise, use the Netflix custom-dropdown strategy to enumerate all explicit numeric and named seasons
4. For each explicit season:
    a. Create one absolute deadline 10 seconds in the future
    b. Call shared `activateSeason()` with that deadline; it performs no click or content-change requirement when already active, waits for the approved minimum live-row readiness threshold when switching, and returns the current live episode selector
    c. Call shared `expandAndValidateSeason()` on the returned live selector with the same deadline to obtain complete validated rows
   d. Pass those rows directly to episode-collector
   e. Store results
    f. If activation, expansion, collection, or count validation fails, re-query controls and retry this season once with one new 10-second deadline
   g. If the retry fails, discard all accumulated results and fail discovery
5. Aggregate all episodes into SeriesInfo only after every season succeeds
6. Return the complete result to `content.ts`
```

---

## API

```typescript
import { SeriesInfo, Episode } from '../types'

/**
 * Discover all episodes for the current series without reading or writing cache.
 * @param seriesId - Netflix series ID
 * @param root - Active Netflix title-details root
 * @param signal - Cancels traversal immediately
 * @returns Promise resolving to SeriesInfo with all episodes
 */
export function discoverEpisodes(
  seriesId: string,
  root: HTMLElement,
  signal: AbortSignal,
): Promise<SeriesInfo>
```

---

## Shared Season Control

Enumeration, activation, transition waiting, expansion, and count validation are delegated to `season-controller.ts`. The traverser owns sequencing, absolute attempt deadlines, aggregation, and retry policy.

Initial episode-selector resolution and explicit-season enumeration form one initialization attempt with a 10-second deadline. If selector lookup, menu rendering, or enumeration fails for a non-abort reason, re-query from `root` and retry initialization once with a new 10-second deadline. A second failure throws `DiscoveryIncompleteError`; `AbortError` is never retried.

Do not implement native-select, tab, or accordion strategies until that Netflix layout is observed and documented.

---

## Season Switching

```typescript
const deadline = performance.now() + 10000
const liveEpisodeSelector = await activateSeason(
  titleRoot,
  episodeSelector,
  season,
  deadline,
  signal,
)
const rows = await expandAndValidateSeason(liveEpisodeSelector, season, deadline, signal)
```

If the requested season is already active, `season-controller.ts` does not click and does not require content to change. If switching is required, it confirms the requested toggle identity, changed episode content, and minimum readiness count: one valid row for unknown or one-episode seasons, otherwise at least two valid rows.

## Episode Section Expansion

Netflix may temporarily clear the episode list or render one placeholder row while switching, and may initially render only the first 10 episodes even when the selected season contains more. `season-controller.ts` does not begin stability counting until the minimum readiness count is met, clicks the expand control once when present, requires disappearance, waits for two stable animation frames, and validates the expected count. Failure applies the traverser's one-retry policy.

## Completeness Policy

Discovery is atomic from the caller's perspective: it returns a complete `SeriesInfo` or fails. It never returns a partial episode array.

Cancellation is not a discovery failure. Every loop, retry, DOM interaction, and wait checks `signal.aborted`. An `AbortError` propagates immediately without retrying, caching, or converting it into a user-facing discovery error.

When a season attempt fails:

1. Discard any transient DOM handle associated with the failed attempt.
2. Re-query Netflix's season controls because the original element may be stale.
3. Activate the same season and wait for it again.
4. If collection succeeds, continue with the remaining seasons.
5. If it fails again, throw `DiscoveryIncompleteError` and discard all accumulated episodes.

The implicit season uses the same one-attempt-plus-one-retry policy. Its retry re-queries the episode selector and expansion control, then repeats expansion, stability, count validation, and collection without attempting season activation.

The retry does not restart seasons that already succeeded during the same operation. The traverser has no cache dependency and never retains results after returning. `content.ts` is the sole cache owner and writes only a complete returned catalog after generation and title validation.

After all seasons succeed, zero total episodes throws `NoEpisodesError`. An empty individual season that remains empty after retry throws `DiscoveryIncompleteError`, so it maps to the failed-season message rather than the whole-catalog zero message.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Episode rows with no season control | Collect once as one implicit season |
| One explicit dropdown season | Activate it and collect episodes |
| Dropdown switch doesn't update DOM | Re-query and retry once; fail complete discovery if retry also times out |
| Enumerated season has no episodes | Retry once; fail complete discovery if it remains empty |
| Episode section has expand control | Expand and wait for complete stable row count |
| Menu declares episode count | Validate collected count exactly |
| 30+ seasons | Process sequentially (don't overwhelm DOM) |

---

## Performance

- Process seasons sequentially (not in parallel) to avoid DOM thrashing
- Use MutationObserver for DOM updates (not polling)
- Return durable metadata so `content.ts` may cache complete catalogs
- Limit DOM reads to episode container subtree

---

## Testing

- Unit test: Season enumeration logic (mock DOM)
- Unit test: Parse season label and expected count from dropdown menu items
- Unit test: Parse named labels with or without counts into durable normalized keys
- Integration test: Mock Netflix custom dropdown with multiple seasons
- Integration test: Expansion grows 10 visible rows to the declared season count
- Integration test: Old rows do not satisfy season-change readiness
- Integration test: Failed season succeeds on its one retry
- Integration test: Second failure rejects discovery without returning partial results
- Integration test: Abort during season switching stops traversal without retry or result
- Manual test: Verify on real Netflix series with multiple seasons
