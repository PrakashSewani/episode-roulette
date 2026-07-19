# detector.ts — Series Page Detection

## Purpose

Determine if the current Netflix page is a TV series page (vs movie, browse page, etc.).

---

## Responsibilities

1. Analyze URL to check for series pattern
2. Analyze DOM for series-specific signals
3. Return detection result with confidence

---

## Detection Strategy

### URL Signals

- URL matches pattern: `netflix.com/title/\d+`
- Extract series ID from URL for later use

### DOM Signals

- Presence of season selector element (tabs, dropdown, or accordion labeled "Season")
- Presence of episode list container
- Presence of episode row elements

### Exclusion Signals

- No season selector → likely a movie
- URL is browse/search page → not a series
- URL is `/watch/` → already playing, skip detection

---

## API

```typescript
interface DetectionResult {
  /** Whether this is a TV series page */
  isSeries: boolean

  /** Series ID extracted from URL (null if not a series) */
  seriesId: string | null

  /** Series title extracted from DOM (null if not found) */
  seriesTitle: string | null

  /** Which signals triggered detection */
  signals: string[]
}

/**
 * Detect if the current page is a TV series.
 * @param url - Current window URL
 */
export function detect(url: string): DetectionResult
```

---

## Signal Priority

1. URL pattern match (strongest signal)
2. Season selector presence (strong supporting signal)
3. Episode list presence (weak signal, used for confirmation)

**If URL matches but no season selector found**: Log warning, still treat as series (DOM may be loading).

**If URL doesn't match but season selector found**: Log warning, treat as non-series (false positive possible).

---

## Series ID Extraction

From URL pattern `netflix.com/title/(\d+)`:
- Group 1 is the series ID
- Store for use by episode discovery and caching

---

## Edge Cases

| Case | Behavior |
|------|----------|
| URL matches but DOM not loaded yet | Return `isSeries: true`, wait for DOM signals |
| Multiple series pages in quick succession | Use latest URL only |
| Netflix Kids profile | Same detection logic (DOM structure differs but patterns hold) |
| Movie with similar URL pattern | URL pattern is different for movies (`/title/` only for series) |

---

## Testing

- Unit test: URL pattern matching with various Netflix URL formats
- Unit test: Signal combination logic
- Manual test: Navigate to series, movie, browse page — verify detection
