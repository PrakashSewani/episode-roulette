# Selectors Reference

## Overview

This document records dated observations of Netflix's live desktop DOM and evidence used to maintain selector contracts. It is not the implementation source of truth.

The normative selector API and ordered fallback lists are defined in `docs/module-specs/selectors.ts.md` and implemented in `src/netflix/selectors.ts`. If this reference differs from that spec, update the spec through the documentation-first workflow before changing implementation.

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

### Active Title Details

| Name | Selectors | Notes |
|------|-----------|-------|
| Title Details Root | `[data-uia="modal-motion-container-DETAIL_MODAL"][role="dialog"]`, `[data-uia="title-details"]`, `[data-testid="title-details"]`, validated `[role="dialog"]` fallback | Root for scoped detection; first selector was verified on Netflix desktop |
| Title Details Metadata | `[data-uia="previewModal--detailsMetadata"]`, `[data-uia="preview-modal-synopsis"]` | Validates a generic dialog as a Netflix title-details surface |

Episode and season selectors used for detection must be queried within the active title-details root. Matches elsewhere on browse, genre, and search pages are ignored.

### Series Page Detection

| Name | Selectors | Notes |
|------|-----------|-------|
| Episode Selector | `[data-uia="episode-selector"]` | Contains the active season controls and episode rows |
| Episode Row | `[data-uia="titleCard--container"][role="button"]` within episode selector | Presence confirms episodic UI; row itself is clickable |
| Season Dropdown Toggle | `[data-uia="dropdown-toggle"][aria-haspopup="true"]` | Optional for confirmation; absent on an implicit single season |

### Play Button

| Name | Selectors | Notes |
|------|-----------|-------|
| Play Button | `[data-uia="play-button"]`, `[data-testid="play-button"]`, `button[data-testid="episodic-play-all"]` | Our button goes next to this |

### Season Navigation

| Name | Selectors | Notes |
|------|-----------|-------|
| Dropdown Toggle | `[data-uia="dropdown-toggle"][aria-haspopup="true"]` | Custom Netflix control; text identifies current season |
| Dropdown Menu | `[data-uia="dropdown-menu"][role="menu"]` | Appears after opening the toggle |
| Dropdown Item | `[data-uia="dropdown-menu-item"][role="menuitem"]` | Season label and optional expected episode count |
| Expand Section | `[data-uia="section-expand"]` | Loads rows beyond the initial truncated episode set |

### Episode Display

| Name | Selectors | Notes |
|------|-----------|-------|
| Episode List | `[data-uia="episode-selector"]` | Container for the active season's episode rows |
| Episode Row | `[data-uia="titleCard--container"][role="button"]` | Individual clickable episode element |
| Episode Title | `[data-uia="episode-title"]`, `[data-testid="episode-title"]`, `h4[class*="episodeTitle"]` | Episode name text |
| Episode Number | `[data-uia="episode-number"]`, `[data-testid="episode-number"]`, scoped `.titleCard-title_index` | Leading index observed in Netflix episode rows |
| Episode Link | No verified selector | The observed row contained no anchor; durable playback is a separate architecture decision |

---

## Maintaining Selectors

When Netflix updates their UI:

1. **Inspect the new DOM** in Chrome DevTools
2. **Look for `data-uia` attributes first** — these are the most stable
3. **Check `data-testid` attributes** as fallback
4. **Verify across multiple series** — don't use series-specific selectors
5. **Record the evidence here** — include date, page type, and observed structure
6. **Update the normative selector spec** — approve ordered fallbacks in `module-specs/selectors.ts.md`
7. **Update `selectors.ts` and test** — verify detection, button injection, discovery, and playback resolution

---

## Testing Selectors

Run in browser console to verify selectors work:

```javascript
// Check if episode selector exists
document.querySelector('[data-uia="episode-selector"]')

// Check all episode rows
document.querySelectorAll('[data-uia="episode-selector"] [data-uia="titleCard--container"][role="button"]')

// Check play button
document.querySelector('[data-uia="play-button"]')
```

---

## Known Netflix Selectors (as of July 2026)

These are documented based on observation. They may change without notice.

| Element | Selector | Notes |
|---------|----------|-------|
| Play button | `[data-uia="play-button"]` | Main play button on series page |
| Detail modal | `[data-uia="modal-motion-container-DETAIL_MODAL"][role="dialog"]` | Active title-details overlay |
| Episode selector | `[data-uia="episode-selector"]` | Season control and episode-list root |
| Season toggle | `[data-uia="dropdown-toggle"]` | Opens custom season menu |
| Season menu item | `[data-uia="dropdown-menu-item"][role="menuitem"]` | Selectable season |
| Episode row | `[data-uia="titleCard--container"][role="button"]` | Clickable row; no anchor observed |
| Expand section | `[data-uia="section-expand"]` | Reveals episodes after the initial 10 rows |
| Episode number | `[data-uia="episode-number"]` | "E1", "Ep. 2", etc. |

### Named Season Observation — July 24, 2026

Live Safari inspection of Netflix title `80179831` (JoJo's Bizarre Adventure) confirmed the custom dropdown uses the existing documented selectors and exposes named labels with optional count text, including `Phantom Blood/Battle Tendency (26 Episodes)`, `Stardust Crusaders (48 Episodes)`, `Diamond Is Unbreakable (39 Episodes)`, and `Golden Wind (39 Episodes)`. The closed toggle displays the selected named label without the count. Traversal successfully identifies and switches these entries. Continuous episode-card rendering mutations were observed after the complete rows appeared, so row completeness/stability is based on the valid-row identity snapshot rather than arbitrary subtree quietness.

**Disclaimer**: These selectors are based on observation and may change. The extension is designed to handle this via fallback selectors and easy updates to `selectors.ts`.
