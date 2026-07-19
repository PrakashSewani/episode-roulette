# episode-collector.ts — Episode Parsing

## Purpose

Parse episode elements from Netflix's DOM into structured `Episode` objects.

---

## Responsibilities

1. Given a rendered season's DOM, extract episode metadata
2. Find clickable elements for each episode
3. Extract episode titles, numbers, and URLs
4. Return array of `Episode` objects

---

## API

```typescript
import { Episode } from '../types'

/**
 * Collect all visible episodes from the current DOM.
 * @param seriesId - Netflix series ID
 * @param seriesTitle - Display title of the series
 * @param seasonNumber - Current season number
 * @returns Array of Episode objects found in the DOM
 */
export function collectEpisodes(
  seriesId: string,
  seriesTitle: string,
  seasonNumber: number
): Episode[]
```

---

## Parsing Strategy

### Step 1: Find Episode Container

Use `EPISODE_LIST` selector to find the episode container.

```typescript
import { resilientQuery } from '../netflix/dom-utils'
import { EPISODE_LIST } from '../netflix/selectors'

const container = resilientQuery(EPISODE_LIST.selectors)
```

### Step 2: Find Episode Rows

Within the container, find all episode row elements.

```typescript
import { resilientQueryAll } from '../netflix/dom-utils'
import { EPISODE_ROW } from '../netflix/selectors'

const rows = resilientQueryAll(EPISODE_ROW.selectors, container)
```

### Step 3: Parse Each Episode

For each row, extract:

```typescript
function parseEpisode(row: HTMLElement, ...): Episode {
  const title = getTextContent(EPISODE_TITLE.selectors, row)
  const link = resilientQuery(EPISODE_LINK.selectors, row) as HTMLAnchorElement

  return {
    seriesId,
    seriesTitle,
    seasonNumber,
    episodeNumber: extractEpisodeNumber(row, title),
    title: title || 'Unknown Episode',
    element: row,
    url: link?.href || window.location.href
  }
}
```

### Step 4: Episode Number Extraction

Netflix may display episode numbers in various formats:
- "E1" or "Ep. 1"
- "Episode 1"
- Implicit (order in the list)

```typescript
function extractEpisodeNumber(row: HTMLElement, title: string | null): number {
  // Try to find explicit episode number in DOM
  // Fall back to position in list
}
```

---

## Element References

**Critical**: Store reference to the clickable DOM element (`element` field). This is used later by `navigator.ts` to trigger playback via `.click()`.

If the element reference becomes stale (DOM re-rendered), `navigator.ts` falls back to URL navigation.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Episode title not found | Use "Unknown Episode" |
| Episode number not found | Use position in list (1-indexed) |
| No episodes in season | Return empty array |
| Episode element not clickable | Use parent element or link |
| Episode has no link | Use current page URL as fallback |

---

## Testing

- Unit test: Parse mock DOM with known episode structure
- Unit test: Handle missing title/number gracefully
- Manual test: Verify on real Netflix episode list
