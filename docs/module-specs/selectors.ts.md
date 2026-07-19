# selectors.ts — DOM Selector Configuration

## Purpose

Single source of truth for all Netflix DOM selectors. When Netflix changes their markup, only this file needs updating.

---

## Responsibilities

1. Define all selectors used across the extension
2. Provide ordered fallback lists for each selector
3. Include human-readable names for logging

---

## Selector Format

```typescript
interface SelectorConfig {
  /** Human-readable name for logging and debugging */
  name: string

  /** Ordered list of CSS selectors to try (first match wins) */
  selectors: string[]
}
```

---

## Defined Selectors

### Series Detection

```typescript
export const SERIES_PAGE = {
  name: 'Season Selector',
  selectors: [
    '[data-uia="season-selector"]',
    '[data-testid="season-selector"]',
    '[class*="season"]',  // fallback — less reliable
  ]
}
```

### Play Button

```typescript
export const PLAY_BUTTON = {
  name: 'Play Button',
  selectors: [
    '[data-uia="play-button"]',
    '[data-testid="play-button"]',
    'button[data-testid="episodic-play-all"]',
  ]
}
```

### Season Tabs/Options

```typescript
export const SEASON_TABS = {
  name: 'Season Tabs',
  selectors: [
    '[data-uia="season-selector"] button',
    '[data-uia="episodes-season-selector"] a',
    '[data-testid="season-selector"] button',
  ]
}
```

### Episode List Container

```typescript
export const EPISODE_LIST = {
  name: 'Episode List Container',
  selectors: [
    '[data-uia="episode-list"]',
    '[data-testid="episode-list"]',
    '[class*="episodeList"]',
  ]
}
```

### Episode Row

```typescript
export const EPISODE_ROW = {
  name: 'Episode Row',
  selectors: [
    '[data-uia="episode-row"]',
    '[data-testid="episode-row"]',
    '[class*="episodeRow"]',
  ]
}
```

### Episode Title

```typescript
export const EPISODE_TITLE = {
  name: 'Episode Title',
  selectors: [
    '[data-uia="episode-title"]',
    '[data-testid="episode-title"]',
    'h4[class*="episodeTitle"]',
  ]
}
```

### Episode Link (for navigation)

```typescript
export const EPISODE_LINK = {
  name: 'Episode Link',
  selectors: [
    'a[data-uia="episode-link"]',
    'a[data-testid="episode-link"]',
    '[data-uia="episode-row"] a',
  ]
}
```

---

## Usage

All modules import from this file:

```typescript
import { PLAY_BUTTON, SEASON_TABS } from './selectors'
import { resilientQuery } from './dom-utils'

const playBtn = resilientQuery(PLAY_BUTTON.selectors)
const tabs = document.querySelectorAll(SEASON_TABS.selectors[0])
```

---

## Maintenance

When Netflix changes their UI:

1. Inspect the new DOM structure
2. Identify new selectors (prefer `data-uia` and `data-testid` attributes)
3. Update the relevant `SelectorConfig` in this file
4. Add old selectors as fallbacks if they still work
5. Test across multiple series to confirm

---

## Do NOT

- Hardcode selectors in other modules
- Use class-name-only selectors without fallbacks
- Add selectors that only work for specific series
