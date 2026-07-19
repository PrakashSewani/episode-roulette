# Selectors Reference

## Overview

All Netflix DOM selectors used by Episode Roulette, centralized for easy maintenance.

Netflix uses dynamic CSS class names (CSS Modules/hashing), so class-based selectors are fragile. We prioritize `data-uia` and `data-testid` attributes as they're more stable.

---

## Selector Priority Order

1. **`data-uia` attributes** — Netflix uses these for testing/automation
2. **`data-testid` attributes** — Alternative test identifiers
3. **ARIA attributes** — `role`, `aria-label`, `aria-testid`
4. **Semantic HTML + structural position** — `button` inside specific parent
5. **Text content matching** — Last resort (fragile across languages)

---

## Selectors

### Series Page Detection

| Name | Selectors | Notes |
|------|-----------|-------|
| Season Selector | `[data-uia="season-selector"]`, `[data-testid="season-selector"]` | Presence indicates TV series |

### Play Button

| Name | Selectors | Notes |
|------|-----------|-------|
| Play Button | `[data-uia="play-button"]`, `[data-testid="play-button"]`, `button[data-testid="episodic-play-all"]` | Our button goes next to this |

### Season Navigation

| Name | Selectors | Notes |
|------|-----------|-------|
| Season Tabs | `[data-uia="season-selector"] button`, `[data-uia="episodes-season-selector"] a`, `[data-testid="season-selector"] button` | Click to switch seasons |
| Season Dropdown | `[data-uia="season-selector"] select`, `[data-testid="season-selector"] select` | Alternative: dropdown UI |

### Episode Display

| Name | Selectors | Notes |
|------|-----------|-------|
| Episode List | `[data-uia="episode-list"]`, `[data-testid="episode-list"]`, `[class*="episodeList"]` | Container for episode rows |
| Episode Row | `[data-uia="episode-row"]`, `[data-testid="episode-row"]`, `[class*="episodeRow"]` | Individual episode element |
| Episode Title | `[data-uia="episode-title"]`, `[data-testid="episode-title"]`, `h4[class*="episodeTitle"]` | Episode name text |
| Episode Link | `a[data-uia="episode-link"]`, `a[data-testid="episode-link"]`, `[data-uia="episode-row"] a` | Clickable link to episode |

---

## Maintaining Selectors

When Netflix updates their UI:

1. **Inspect the new DOM** in Chrome DevTools
2. **Look for `data-uia` attributes first** — these are the most stable
3. **Check `data-testid` attributes** as fallback
4. **Verify across multiple series** — don't use series-specific selectors
5. **Update `selectors.ts`** — add new selectors, keep old ones as fallbacks
6. **Test** — verify button injection and episode discovery still work

---

## Testing Selectors

Run in browser console to verify selectors work:

```javascript
// Check if season selector exists
document.querySelector('[data-uia="season-selector"]')

// Check all episode rows
document.querySelectorAll('[data-uia="episode-row"]')

// Check play button
document.querySelector('[data-uia="play-button"]')
```

---

## Known Netflix Selectors (as of 2024)

These are documented based on observation. They may change without notice.

| Element | Selector | Notes |
|---------|----------|-------|
| Play button | `[data-uia="play-button"]` | Main play button on series page |
| Season selector | `[data-uia="season-selector"]` | Tab or dropdown for seasons |
| Episode row | `[data-uia="episode-row"]` | Individual episode in list |
| Episode title | `[data-uia="episode-title"]` | Episode name |
| Episode number | `[data-uia="episode-number"]` | "E1", "Ep. 2", etc. |

**Disclaimer**: These selectors are based on observation and may change. The extension is designed to handle this via fallback selectors and easy updates to `selectors.ts`.
