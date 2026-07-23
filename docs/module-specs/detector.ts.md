# detector.ts — Series Page Detection

## Purpose

Extract the active Netflix title identity and determine whether a supplied title-details DOM subtree contains episodic content.

---

## Responsibilities

1. Extract the active title identity from a Netflix URL
2. Inspect only the supplied title-details root for episodic UI
3. Distinguish an unconfirmed title context from a confirmed series
4. Return the detection result and observed signals without owning timers or observers

---

## Detection Strategy

### Route Identity

- URL path matches `/title/<numeric-id>`, or the query string contains a numeric `jbv=<title-id>`
- Extract the active title ID for later use
- When `jbv` is present, it identifies the active title-details overlay and takes precedence over an ID in the path
- A matching URL supplies identity only; movies and series can share these forms

Examples:

- `https://www.netflix.com/title/80057281` → candidate ID `80057281`
- `https://www.netflix.com/browse?jbv=81198930` → candidate ID `81198930`
- `https://www.netflix.com/browse/genre/83?jbv=81598435` → candidate ID `81598435`
- `https://www.netflix.com/browse` → not a title-details candidate

### Scoped DOM Signals

- Queries are scoped to the active title-details root supplied by `content.ts`
- Resolve `EPISODE_SELECTOR` within that root and call `getValidEpisodeRows(episodeSelector)` from `season-controller.ts`
- Phase 2 introduces only this shared structural-validation API in `season-controller.ts`; season enumeration, activation, transition, and expansion remain Phase 4 work
- Presence of one or more returned rows confirms a series
- Presence of the verified Netflix custom season dropdown supports multi-season traversal but is not required
- An episode selector with rows but without a supported season control confirms a single-season series with one implicit season
- Episode-like elements elsewhere on the browse page must not influence classification

### Exclusion Signals

- URL has neither a `/title/<id>` path nor a numeric `jbv` parameter → no active title context
- URL pathname begins `/watch/` → already playing, skip detection
- No valid episode rows in the active title-details root → title remains unconfirmed

---

## API

```typescript
interface TitleContext {
  /** Active Netflix title ID. */
  titleId: string

  /** How the identity was obtained. */
  source: 'jbv' | 'title-path'

  /** Full URL at extraction time. */
  url: string
}

interface DetectionResult {
  /** Classification within an active title context. */
  status: 'unconfirmed' | 'series'

  /** Active Netflix title ID. */
  titleId: string

  /** Which signals triggered detection */
  signals: string[]
}

/**
 * Extract the active Netflix title context. Returns null outside title details.
 */
export function getTitleContext(url: string): TitleContext | null

/**
 * Classify episodic UI inside the active title-details root.
 * This function does not query outside `root` and does not wait for rendering.
 */
export function detectSeries(
  context: TitleContext,
  root: ParentNode,
): DetectionResult
```

---

## Signal Priority

1. `getTitleContext()` establishes active title identity only
2. Episode list plus valid episode rows inside `root` establishes `series`
3. Supported season-control presence is traversal metadata only

**If a title context exists but episodic UI is not present**: Return `unconfirmed`. The orchestration layer owns the bounded wait and calls detection again when the scoped root changes.

**If episodic UI exists elsewhere on the page**: Ignore it. Detection is always scoped to the active details root.

**If episode rows exist without a season control**: Return `series`; discovery treats the page as a single implicit season.

---

## Title ID Extraction

Parse with the platform `URL` API:

1. If `url.searchParams.get('jbv')` is numeric, use it as the active title ID.
2. Otherwise, if the pathname matches `/title/(\d+)`, use the captured ID.
3. Otherwise, return no candidate ID.

The extracted value remains `titleId` until episodic UI confirms the context. Downstream series data may then use it as `seriesId`.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Route identity exists but details root is not loaded | Orchestration waits; detector is not called without a root |
| Browse or genre route with numeric `jbv` | Return a title context for the overlay title |
| Browse or genre route without `jbv` | Return `null` title context |
| Multiple series pages in quick succession | Use latest URL only |
| Episode rows exist without season controls | Return `series`; use one implicit season |
| Movie with matching title identity | Remain `unconfirmed`; orchestration ends detection without injecting UI |
| Episode rows outside active details root | Ignore them |

---

## Testing

- Unit test: `/title/<id>` and `jbv=<id>` extraction across Netflix URL formats
- Unit test: `jbv` takes precedence when both URL forms are present
- Unit test: Identity extraction is independent of movie/series classification
- Unit test: Scoped confirmation ignores episode-like rows outside the supplied root
- Unit test: Unconfirmed and series signal combinations
- Unit test: Episode rows without season controls confirm a series
- Manual test: Navigate to series, movie, browse page — verify detection
