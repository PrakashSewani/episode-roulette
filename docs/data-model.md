# Data Model

## Core Types

All shared TypeScript interfaces used across modules.

---

### Provider Identity

```typescript
type ProviderId = 'netflix' | 'prime-video'

type CatalogKey = `${ProviderId}:${string}`
```

`ProviderId` is part of every title context, series catalog, and durable episode record. Provider-local IDs remain opaque strings. `CatalogKey` is the only cache key format; a local ID shared by two providers must never collide.

Prime Video uses the opaque `/detail/<id>` identifier as its provider-local series/season identity. A Prime episode must retain a provider-owned durable identity sufficient for live re-resolution, such as its season detail ID plus episode number and normalized title. It must not retain DOM elements, blob media URLs, or account/session identifiers.

---

### Episode

Represents a single discoverable episode.

```typescript
interface Episode {
  /** Provider owning this record. */
  provider: ProviderId

  /** Provider-local series identity. */
  seriesId: string

  /** Provider-specific durable season identity. */
  seasonKey: string

  /** Season label as displayed, for example "Season 7". */
  seasonLabel: string

  /** Parsed season number when the provider exposes one. */
  seasonNumber: number | null

  /** Zero-based position in the fully expanded eligible season list. */
  episodeIndex: number

  /** Parsed episode number when the provider exposes one. */
  episodeNumber: number | null

  /** Episode title as displayed. */
  title: string

  /** Normalized title used as a durable matching signal when available. */
  normalizedTitle: string | null

  /** Complete eligible row count observed for the season during discovery. */
  discoveredSeasonEpisodeCount: number
}
```

`Episode` contains durable metadata only. It must never retain provider DOM references, blob media URLs, credentials, or session identifiers. `seasonKey` is the provider-specific durable season identity; Netflix uses normalized season keys and Prime Video uses the season detail identity.

---

### SeriesInfo

Aggregated information about a series and its episodes.

```typescript
interface SeriesInfo {
  /** Provider owning this catalog. */
  provider: ProviderId

  /** Provider-local series identity. */
  id: string

  /** Total number of seasons discovered. */
  totalSeasons: number

  /** All discovered eligible episodes across all seasons. */
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

/**
 * Playback was not confirmed within the provider window. Subclass of
 * PlaybackResolutionError, and always distinguished by type, never by message.
 */
class PlaybackTimeoutError extends PlaybackResolutionError {
  readonly name = 'PlaybackTimeoutError'
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

/** Structured discovery failure detail carried for failure reporting. */
interface DiscoveryFailureDetail {
  /** Display label of the season that failed, when known. */
  seasonLabel?: string
  /** Season-controller reason that caused the failure, when known. */
  reason?: SeasonControllerFailureReason
}

class DiscoveryIncompleteError extends Error {
  readonly name = 'DiscoveryIncompleteError'
  readonly seasonLabel: string | null
  readonly reason: SeasonControllerFailureReason | null
  constructor(message: string, detail?: DiscoveryFailureDetail) {
    super(message)
  }
}

class NoEpisodesError extends Error {
  readonly name = 'NoEpisodesError'
}
```

Cancellation uses the platform `AbortError`; it is not wrapped in any product error class.

`DiscoveryIncompleteError` messages remain human-readable and unchanged in wording. The `seasonLabel` and `reason` fields are the structured copy and are what failure reporting reads; report code must never parse an error message.

---

### Failure Report Types

Owned by `src/report.ts` (see `docs/module-specs/report.ts.md`).

```typescript
type ReportErrorCode =
  | 'discovery'
  | 'no-episodes'
  | 'playback-resolution'
  | 'playback-timeout'
  | 'unknown'

interface ReportContext {
  provider: ProviderId
  titleId: string
  error: unknown
}

interface ErrorClassification {
  code: ReportErrorCode
  reason: SeasonControllerFailureReason | null
  seasonLabel: string | null
}
```

`ReportContext` is constructed at the failure site in `content.ts` and never stored. Nothing in the report types is cached, persisted, or retained after the snackbar is dismissed.

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

### DetectionResult

Provider-scoped classification returned from a DOM snapshot. It does not own waiting, observation, or lifecycle state.

```typescript
interface DetectionResult {
  status: 'unconfirmed' | 'series'
  titleId: string
  signals: string[]
}
```

### TitleContext

Identity for the active provider title details. It does not imply that the title is a series.

```typescript
interface TitleContext {
  provider: ProviderId
  /** Provider-local title identity. */
  titleId: string
  source: 'jbv' | 'title-path' | 'prime-detail'
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
  provider: 'netflix',
  id: '80057281',
  totalSeasons: 10,
  episodes: [
    {
      provider: 'netflix',
      seriesId: '80057281',
      seasonKey: 'season 1',
      seasonLabel: 'Season 1',
      seasonNumber: 1,
      episodeIndex: 0,
      episodeNumber: 1,
      title: 'The One Where Monica Gets a Roommate',
      normalizedTitle: 'the one where monica gets a roommate',
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
