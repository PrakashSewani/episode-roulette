# Data Model

## Core Types

All shared TypeScript interfaces used across modules.

---

### Episode

Represents a single discoverable episode.

```typescript
interface Episode {
  /** Netflix series ID (from URL) */
  seriesId: string

  /** Display title of the series */
  seriesTitle: string

  /** Season number (1-indexed) */
  seasonNumber: number

  /** Episode number within the season (1-indexed) */
  episodeNumber: number

  /** Episode title (e.g., "The One Where...") */
  title: string

  /** Reference to the clickable DOM element for this episode */
  element: HTMLElement

  /** Netflix URL for this episode */
  url: string
}
```

---

### SeriesInfo

Aggregated information about a series and its episodes.

```typescript
interface SeriesInfo {
  /** Netflix series ID (from URL) */
  id: string

  /** Display title of the series */
  title: string

  /** Total number of seasons discovered */
  totalSeasons: number

  /** All discovered episodes across all seasons */
  episodes: Episode[]

  /** Timestamp when episodes were discovered (for cache expiry) */
  discoveredAt: number
}
```

---

### NavigationEvent

Events emitted by the SPA observer.

```typescript
type NavigationEventType = 'series-entered' | 'series-left'

interface NavigationEvent {
  type: NavigationEventType

  /** Series ID (only present for 'series-entered') */
  seriesId?: string

  /** Full URL at time of event */
  url: string
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
  title: 'Friends',
  totalSeasons: 10,
  episodes: [
    {
      seriesId: '80057281',
      seriesTitle: 'Friends',
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'The One Where Monica Gets a Roommate',
      element: document.querySelector('[data-uia="ep-101"]'),
      url: 'https://www.netflix.com/title/70005281'
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
// navigator.ts consumes this
function playEpisode(episode: Episode): void {
  episode.element.click()
}
```
