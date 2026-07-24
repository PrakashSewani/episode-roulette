# Data Model

## Core Types

All shared TypeScript interfaces used across modules.

---

### Episode

Represents a single discoverable episode.

```typescript
interface Episode {
  /** Confirmed Netflix series title ID. */
  seriesId: string

  /** Normalized durable key derived from the Netflix season label. */
  seasonKey: string

  /** Netflix season label as displayed, for example "Season 7". */
  seasonLabel: string

  /** Parsed season number when the label is numeric. */
  seasonNumber: number | null

  /** Zero-based position in the fully expanded season list. */
  episodeIndex: number

  /** Parsed episode number when Netflix exposes one. */
  episodeNumber: number | null

  /** Episode title (e.g., "The One Where...") */
  title: string

  /** Complete row count observed for the season during discovery. */
  discoveredSeasonEpisodeCount: number
}
```

`Episode` contains durable metadata only. It must never retain Netflix `HTMLElement` references or invent an episode URL from the current title-details URL.

`seasonKey` is strategy-specific. Explicit numeric seasons use `season <parsed positive integer>` with no leading zeroes. Named seasons use `label:<normalized label>`, where normalization is NFKC, trimmed, whitespace-collapsed, and lowercased with `en-US`. Named seasons store `seasonNumber: null`; an episode count is optional. The implicit single-season strategy always uses key `implicit` and display label `Episodes`.

---

### SeriesInfo

Aggregated information about a series and its episodes.

```typescript
interface SeriesInfo {
  /** Netflix series ID (from URL) */
  id: string

  /** Total number of seasons discovered */
  totalSeasons: number

  /** All discovered episodes across all seasons */
  episodes: Episode[]

  /** Diagnostic timestamp; cache has no TTL. */
  discoveredAt: number
}
```

`SeriesInfo` is the only cached product data. There is no selected-episode, played-episode, history, repeat-prevention, or weighting type.

### SeasonDescriptor

Shared durable season identity used by discovery, playback, and the season controller.

```typescript
interface SeasonDescriptor {
  key: string
  label: string
  seasonNumber: number | null
  expectedEpisodeCount: number | null
}
```

### EpisodeRowIdentity

Transient parsed identity for a current Netflix row. It is never cached.

```typescript
interface EpisodeRowIdentity {
  title: string
  normalizedTitle: string | null
  episodeNumber: number | null
  episodeNumberConflict: boolean
  episodeIndex: number
}
```

### Controller and Operation Errors

Shared typed errors used by season control, discovery, playback, and orchestration.

```typescript
class CacheValidationMismatchError extends Error {
  readonly name = 'CacheValidationMismatchError'
}

class PlaybackResolutionError extends Error {
  readonly name = 'PlaybackResolutionError'
}

type SeasonControllerFailureReason =
  | 'unsupported-layout'
  | 'season-missing'
  | 'strategy-mismatch'
  | 'active-season-mismatch'
  | 'count-mismatch'
  | 'render-timeout'
  | 'transition-timeout'
  | 'expansion-failed'

class SeasonControllerError extends Error {
  readonly name = 'SeasonControllerError'
  constructor(readonly reason: SeasonControllerFailureReason, message: string) {
    super(message)
  }
}

class DiscoveryIncompleteError extends Error {
  readonly name = 'DiscoveryIncompleteError'
}

class NoEpisodesError extends Error {
  readonly name = 'NoEpisodesError'
}
```

Cancellation uses the platform `AbortError`; it is not wrapped in any product error class.

---

### NavigationEvent

Neutral events emitted by the SPA observer. These events never classify content.

```typescript
type PageChangeEvent =
  | { type: 'route-changed'; url: string }
  | { type: 'title-dom-changed'; url: string; generation: number }
  | { type: 'title-root-removed'; url: string; generation: number }
```

`route-changed` events have no generation because they initiate context replacement. `title-dom-changed` and `title-root-removed` carry a generation, and stale generations are suppressed before callback delivery.

### TitleContext

Identity for the active Netflix title details. It does not imply that the title is a series.

```typescript
interface TitleContext {
  titleId: string
  source: 'jbv' | 'title-path'
  url: string
}
```

### OperationContext

Owned only by `content.ts`; passed to async flows through its signal and validation closure.

```typescript
interface OperationContext {
  title: TitleContext
  generation: number
  controller: AbortController
  /** Absolute performance.now() deadline for title detection. */
  detectionDeadline: number
}
```

---

### ButtonState

Possible states for the injected button.

```typescript
type ButtonState = 'loading' | 'ready' | 'error'
```

---

### SelectorConfig

Configuration for a DOM selector with fallbacks.

```typescript
interface SelectorConfig {
  /** Human-readable name for logging */
  name: string

  /** Ordered list of selectors to try (first match wins) */
  selectors: string[]
}
```

---

## Usage Patterns

### Episode Discovery Flow

```typescript
// season-traverser.ts produces this
const seriesInfo: SeriesInfo = {
  id: '80057281',
  totalSeasons: 10,
  episodes: [
    {
      seriesId: '80057281',
      seasonKey: 'season 1',
      seasonLabel: 'Season 1',
      seasonNumber: 1,
      episodeIndex: 0,
      episodeNumber: 1,
      title: 'The One Where Monica Gets a Roommate',
      discoveredSeasonEpisodeCount: 24
    },
    // ... more episodes
  ],
  discoveredAt: Date.now()
}
```

### Random Selection

```typescript
// randomizer.ts consumes this
function pickRandom(episodes: Episode[]): Episode {
  const index = Math.floor(Math.random() * episodes.length)
  return episodes[index]
}
```

### Playback Navigation

```typescript
// navigator.ts consumes durable metadata, resolves the current live row,
// and clicks only after a unique identity match.
await playEpisode(
  episode,
  titleDetailsRoot,
  operation.controller.signal,
  () => assertCurrent(operation),
)
```
