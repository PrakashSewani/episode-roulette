# selectors.ts — DOM Selector Configuration

## Purpose

Normative source of truth for all Netflix DOM selectors exported by `src/netflix/selectors.ts`. When Netflix changes its markup, selector implementation contracts are updated here first.

---

## Responsibilities

1. Define all selectors used across the extension
2. Provide ordered fallback lists for each selector
3. Include human-readable names for logging
4. Contain selector data only, with no querying, parsing, waiting, or interaction behavior

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

### Active Title Details Root

```typescript
export const TITLE_DETAILS_ROOT = {
  name: 'Active Title Details Root',
  selectors: [
    '[data-uia="modal-motion-container-DETAIL_MODAL"][role="dialog"]',
    '[data-uia="title-details"]',
    '[data-testid="title-details"]',
    '[role="dialog"]',
  ]
}
```

Fallbacks must resolve the container representing the currently active Netflix title page or detail overlay. A generic `[role="dialog"]` match is accepted only after the active route contains a title identity and must be validated by title-detail structure before it is used as the detection root.

All classification, button placement, and discovery queries are scoped to this root where the Netflix layout permits it. Episode rows elsewhere on the browse page are never series-detection signals.

`TITLE_DETAILS_ROOT` uses aggregate fallback semantics rather than `resilientQueryAll` first-success semantics. `content.ts` iterates every selector, combines and de-duplicates every match, then requires exactly one connected, visible candidate containing documented Netflix title-detail structure. Selector order documents preference but never permits choosing an ambiguous first match.

### Episode Selector and List Container

```typescript
export const EPISODE_SELECTOR = {
  name: 'Episode Selector',
  selectors: [
    '[data-uia="episode-selector"]',
  ]
}
```

`EPISODE_SELECTOR` is the single named configuration for the episode-section container. Detection, season control, expansion, and row queries all use it; there is no separate `EPISODE_LIST` alias.

### Title Details Metadata

```typescript
export const TITLE_DETAILS_METADATA = {
  name: 'Title Details Metadata',
  selectors: [
    '[data-uia="previewModal--detailsMetadata"]',
    '[data-uia="preview-modal-synopsis"]',
  ]
}
```

This selector validates that a generic dialog is a Netflix title-details surface. It does not classify the title as a series.

### Netflix Season Dropdown

```typescript
export const SEASON_DROPDOWN_TOGGLE = {
  name: 'Season Dropdown Toggle',
  selectors: [
    '[data-uia="dropdown-toggle"][aria-haspopup="true"]',
  ]
}

export const SEASON_DROPDOWN_MENU = {
  name: 'Season Dropdown Menu',
  selectors: [
    '[data-uia="dropdown-menu"][role="menu"]',
  ]
}

export const SEASON_DROPDOWN_ITEM = {
  name: 'Season Dropdown Item',
  selectors: [
    '[data-uia="dropdown-menu-item"][role="menuitem"]',
  ]
}
```

Menu items whose normalized label does not identify a season, such as `See All Episodes`, are not season descriptors.

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

### Expand Episode Section

```typescript
export const SECTION_EXPAND = {
  name: 'Expand Episode Section',
  selectors: [
    '[data-uia="section-expand"]',
  ]
}
```

### Episode Row

```typescript
export const EPISODE_ROW = {
  name: 'Episode Row',
  selectors: [
    '[data-uia="titleCard--container"][role="button"]',
  ]
}
```

A valid episode row is an `HTMLElement` matching `EPISODE_ROW` that is connected, visible by the shared layout-box/display/visibility test, and has `role="button"`. `season-controller.ts#getValidEpisodeRows()` is the sole implementation of this structural check and is shared with detection. Controller operations return only complete arrays of valid rows. Episode identity parsing is separate: a structurally valid row may still produce placeholder metadata, but it is never silently dropped.

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

### Episode Number

```typescript
export const EPISODE_NUMBER = {
  name: 'Episode Number',
  selectors: [
    '[data-uia="episode-number"]',
    '[data-testid="episode-number"]',
    '.titleCard-title_index',
  ]
}
```

The final fallback is queried only within the supplied episode row, so it remains structurally scoped rather than becoming a global class-name query.

There is no `EPISODE_LINK` selector. No anchor was present inside the observed Netflix desktop episode row in July 2026, and playback re-resolves and clicks the current live row instead of navigating to a URL.

---

## Usage

All modules import from this file:

```typescript
import { PLAY_BUTTON, SEASON_DROPDOWN_ITEM } from './selectors'
import { resilientQuery, resilientQueryAll } from './dom-utils'

const playBtn = resilientQuery(PLAY_BUTTON.selectors, titleDetailsRoot)
const seasons = resilientQueryAll(SEASON_DROPDOWN_ITEM.selectors, titleDetailsRoot)
```

Feature modules may import these named configurations. `dom-utils.ts` must not import this module; callers pass selector arrays into generic query helpers.

---

## Maintenance

When Netflix changes their UI:

1. Record dated live evidence in `docs/selectors-reference.md`
2. Verify the layout across multiple Netflix series when possible
3. Update this normative module spec with the approved selector contract
4. Update the relevant `SelectorConfig` in `src/netflix/selectors.ts`
5. Keep older selectors as ordered fallbacks only when still valid
6. Run selector, detection, traversal, and playback-resolution tests

---

## Do NOT

- Hardcode selectors in other modules
- Use class-name-only selectors without fallbacks
- Add selectors that only work for specific series
- Add query helpers, parsing functions, click behavior, or MutationObservers to `selectors.ts`
