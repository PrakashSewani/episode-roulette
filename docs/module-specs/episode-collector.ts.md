# episode-collector.ts — Episode Parsing

## Purpose

Parse episode elements from Netflix's DOM into structured `Episode` objects.

---

## Responsibilities

1. Given a rendered season's DOM, extract episode metadata
2. Extract durable season and episode identity metadata
3. Record each episode's position in the fully expanded season list
4. Return array of `Episode` objects

---

## API

```typescript
import { Episode, SeasonDescriptor } from '../types'

/**
 * Collect all episodes from a fully expanded season.
 * @param seriesId - Netflix series ID
 * @param season - Active durable season descriptor
 * @param rows - Complete validated live rows from season-controller.ts
 * @returns Array of Episode objects found in the DOM
 */
export function collectEpisodes(
  seriesId: string,
  season: SeasonDescriptor,
  rows: HTMLElement[],
): Episode[]
```

---

## Parsing Strategy

### Step 1: Accept Validated Rows

The collector performs no Netflix DOM query. `season-controller.ts` returns the complete, expanded, stable, count-validated rows, and `season-traverser.ts` passes them directly.

### Step 2: Parse Each Episode

For each row, extract:

```typescript
function parseEpisode(
  row: HTMLElement,
  episodeIndex: number,
  seasonEpisodeCount: number,
  ...
): Episode {
  const identity = parseEpisodeRowIdentity(row, episodeIndex)

  return {
    seriesId,
    seasonKey: season.key,
    seasonLabel: season.label,
    seasonNumber: season.seasonNumber,
    episodeIndex,
    episodeNumber: identity.episodeNumber,
    title: identity.title,
    discoveredSeasonEpisodeCount: seasonEpisodeCount,
  }
}
```

On the verified Netflix desktop row, the episode title is available through the row's `aria-label`. All title normalization, source precedence, episode-number parsing, and conflict behavior are delegated to `episode-identity.ts`.

### Step 3: Shared Identity Parsing

Call `parseEpisodeRowIdentity(row, episodeIndex)` from `episode-identity.ts`. The collector stores its parsed display title and optional episode number. It does not maintain a separate parser.

---

## Durable Metadata

Do not store episode rows. Netflix replaces rows whenever traversal switches seasons, making earlier references stale before discovery finishes.

Do not use `window.location.href` as an episode URL. The observed Netflix row contains no anchor, and the details URL identifies the series rather than an episode.

The collector and navigator both import `episode-identity.ts`; duplicate parsing or normalization logic is forbidden.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Episode title not found | Use "Unknown Episode" |
| Episode number not found | Store `null`; preserve zero-based `episodeIndex` |
| No episodes in season | Return empty array |
| Supplied validated row has missing title/number metadata | Preserve the row with documented placeholder/null identity |

The collector parses every supplied row and never filters or revalidates rows. `season-controller.ts` owns connected, visible, clickable row validity and complete row counts, and traversal calls the synchronous collector immediately after validation without an asynchronous boundary.

---

## Testing

- Unit test: Parse mock DOM with known episode structure
- Unit test: Handle missing title/number gracefully
- Unit test: Produces no DOM references or title-page URL fallbacks
- Unit test: Uses complete-season zero-based indexes and row count
- Manual test: Verify on real Netflix episode list
