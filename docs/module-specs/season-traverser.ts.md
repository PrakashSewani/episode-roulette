# season-traverser.ts — Episode Discovery

## Purpose

Discover all playable episodes across all seasons of the current TV series by traversing Netflix's UI.

---

## Responsibilities

1. Find all season tabs/options
2. Programmatically click each season
3. Wait for DOM to update with that season's episodes
4. Delegate episode parsing to `episode-collector.ts`
5. Aggregate episodes across all seasons
6. Cache results per series ID

---

## Discovery Flow

```
1. Find season selector element
2. Enumerate all season tabs
3. For each season:
   a. Click the season tab
   b. Wait for DOM update (MutationObserver, 5s timeout)
   c. Call episode-collector to parse visible episodes
   d. Store results
4. Aggregate all episodes into SeriesInfo
5. Cache in memory
```

---

## API

```typescript
import { SeriesInfo, Episode } from '../types'

/**
 * Discover all episodes for the current series.
 * Uses cache if available.
 * @param seriesId - Netflix series ID
 * @returns Promise resolving to SeriesInfo with all episodes
 */
export function discoverEpisodes(seriesId: string): Promise<SeriesInfo>

/**
 * Clear the episode cache for a series.
 * @param seriesId - Series to clear cache for (or all if omitted)
 */
export function clearCache(seriesId?: string): void
```

---

## Season Enumeration

Find season tabs using selectors from `selectors.ts`:

```typescript
import { SEASON_TABS } from '../netflix/selectors'

const tabs = resilientQueryAll(SEASON_TABS.selectors)
const seasonCount = tabs.length
```

**Handle different UI patterns**:
- Tab bar (click each tab)
- Dropdown (select each option)
- Accordion (click to expand each)

---

## Season Switching

```typescript
// Click a season tab
seasonTab.click()

// Wait for DOM update
await waitForElement(EPISODE_ROW.selectors, 5000)
```

**Important**: After clicking a season tab, Netflix lazy-loads that season's episodes. We must wait for the DOM to update before collecting episodes.

---

## Caching

```typescript
const cache = new Map<string, SeriesInfo>()

// Check cache before discovery
if (cache.has(seriesId)) {
  return cache.get(seriesId)!
}

// After discovery
cache.set(seriesId, seriesInfo)
```

**Cache rules**:
- Key: series ID
- Value: `SeriesInfo` with timestamp
- No expiry (session only — lost on page refresh)
- Clear on `series-left` event

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Only one season | Click the only tab, collect episodes |
| Season tab click doesn't update DOM | Timeout after 5s, skip that season |
| Season has no episodes | Skip, don't include in results |
| Netflix shows loading spinner | Wait for spinner to disappear before collecting |
| Season tabs load lazily | Wait for all tabs to appear before starting |
| 30+ seasons | Process sequentially (don't overwhelm DOM) |

---

## Performance

- Process seasons sequentially (not in parallel) to avoid DOM thrashing
- Use MutationObserver for DOM updates (not polling)
- Cache results to avoid re-discovery
- Limit DOM reads to episode container subtree

---

## Testing

- Unit test: Season enumeration logic (mock DOM)
- Integration test: Mock Netflix DOM with multiple seasons
- Manual test: Verify on real Netflix series with multiple seasons
