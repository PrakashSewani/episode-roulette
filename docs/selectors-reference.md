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

### Video Player and Timeline

| Name | Selectors | Notes |
|------|-----------|-------|
| Video Player | `video` | Readiness / progress only; **do not** set `currentTime` (M7375) |
| Player Timeline | `[data-uia="timeline"]`, `[data-uia="timeline-bar"]`, `[data-uia="player-timeline"]`, `[data-uia="scrubber"]`, bottom-controls `[role="slider"]`, seek/scrubber aria labels | Target for one user-like click at bar start |

**Observation date:** 2026-07-26 — Live random-roll logs found `<video>` at resume position (~244s, `readyState: 4`, playing, blob src). Assigning `currentTime = 0` produced Netflix error M7375 ("Pardon the interruption") after a brief flash. Restart uses timeline UI interaction instead: absolute-left scrubber click moves playback near start (~2s) without M7375. A 1%-width click landed ~13s mid-episode. Live timeline match used `[data-uia="timeline"]` (width ~1566px).

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

Live Safari inspection of Netflix title `80179831` (JoJo's Bizarre Adventure) confirmed the custom dropdown uses the existing documented selectors and exposes named labels with optional count text, including `Phantom Blood/Battle Tendency (26 Episodes)`, `Stardust Crusaders (48 Episodes)`, `Diamond Is Unbreakable (39 Episodes)`, and `Golden Wind (39 Episodes)`. Menu items commonly place the count on the same line as the label; the closed toggle displays the selected named label without the count. Continuous episode-card rendering mutations were observed after the complete rows appeared, so row completeness/stability is based on the valid-row identity snapshot rather than arbitrary subtree quietness.

**Live status (validated 2026-08-01, title `80179831` JoJo):** Named-season dropdowns use the same selectors as numeric seasons. Menu items often put the English count on the same line as the arc label; the closed toggle omits the count. Stability uses durable episode identity (title/number), not full row `textContent`. Large arcs can load in batches without `section-expand` (Stardust Crusaders: 30 of 48, then 48 after scoped list scroll). After `/watch/` remount, the season dropdown may be absent briefly; activation/enumeration wait for the toggle within the season deadline. Document/body scrolling must not be used for lazy load (twitches the modal).

**Disclaimer**: These selectors are based on observation and may change. The extension is designed to handle this via fallback selectors and easy updates to `selectors.ts`.

---

## Prime Video Observation — India / Brave / English — 2026-08-12

Source: sanitized user-provided captures of Prime Video's authenticated Reacher detail page and a season-selected detail page. The raw captures remain untracked and must not be committed because they contain account/profile and session telemetry.

Observed route behavior:

- Series detail uses an opaque path of the form `/detail/<content-id>`.
- Reacher Season 4 loaded at `/detail/0K16R3PLUFGC2JUE457C26O4OD`.
- Selecting Season 3 navigated to `/detail/0H1T1C23B07HLZPPHJSSPMYSL7` with a Prime season-selection referral query.
- Season selection replaces the displayed season catalog; the supplied capture contained four visible episode cards for the selected season.

Observed stable hooks:

| Name | Selector | Notes |
|---|---|---|
| Detail wrapper | `[data-testid="DVWebNode-detail-wrapper"]` | Prime title detail boundary observed in both captures |
| Main detail root | `main[data-testid="detailpage-main"]` | Candidate scoped title root |
| Season selector | `[data-testid="dp-season-selector"]` | Contains current season and season links |
| Season link | `[data-testid="dp-season-selector"] a[href*="/detail/"]` | Season navigation uses provider detail URLs; verify against authenticated live DOM before implementation |
| Episodes tab | `button[data-testid="btf-episodes-tab"][role="tab"]` | Selected tab had `aria-selected="true"` |
| Episode row | `li[data-testid="episode-list-item"]` | One row per rendered episode card |
| Episode play control | `a[data-testid="episodes-playbutton"][role="button"]` | Accessible label observed as `Play S1 E1`, `Play S4 E1`, etc. |
| Episode runtime | `[data-testid="episode-runtime"]` | Runtime text such as `56min` or `46min` |
| Episode release date | `[data-testid="episode-release-date"]` | Release date text |
| Main play control | `a[data-testid="dp-atf-play-button"][role="button"]` | Accessible label identifies the first/current episode, not necessarily a random-episode target |

Eligibility evidence:

- Reacher Season 4 rendered eight episode rows in the supplied full capture.
- Episodes 1–3 exposed `episodes-playbutton` controls.
- Episodes 4–8 were marked `COMING SOON` and had no episode play control in the capture.
- The public/detail content also exposed Prime subscription/trial messaging, so row presence alone is not sufficient proof of playability or entitlement.
- The initial evidence supports filtering to rows with a native episode play control and excluding `COMING SOON` rows, but authenticated entitlement behavior still requires live confirmation.

Playback evidence update — 2026-08-12:

- Selecting an episode does not change the Prime detail URL. The reported pre-click and post-click URL remained `/detail/0PW27PB7O60V7NZOIXFYF68ZG8` with the same query string.
- A URL transition cannot be used as Prime playback confirmation. Confirmation must use a stable player DOM signal or another observed playback-state predicate.

Playback capture update — 2026-08-12:

- Episode playback opens an in-page overlay without changing the `/detail/<opaque-id>` URL.
- Player root: `#dv-web-player` with `div[aria-label="Web Player"]`.
- Loading state: `.atvwebplayersdk-loading-overlay[role="status"]` inside the player container.
- Player metadata: `.atvwebplayersdk-title-text`, `.atvwebplayersdk-episode-info`, and `.atvwebplayersdk-episode-timing-container`.
- Stable native controls observed by ID: `#atvwebplayersdk-close-player-button`, `#atvwebplayersdk-captions-toggle-button`, `#atvwebplayersdk-mute-toggle-button`, `#atvwebplayersdk-volume-slider`, `#atvwebplayersdk-fullscreen-toggle-button`, and `#atvwebplayersdk-settings-button`.
- A `<video aria-hidden="true">` element exists inside the player surface. Its `blob:` source is session-specific and must never be stored or used as durable episode identity.
- The capture does not expose a stable Prime play/pause button or timeline/scrubber selector. Playback confirmation should wait for the player root and episode metadata to appear, then require the loading overlay to be absent or otherwise observe a stronger ready/playing predicate from a live capture.

Authenticated Brave evidence update — 2026-08-15:

- Re-run on the same authenticated India/Brave profile across Reacher Season 1–4 detail pages.
- Episode-row play controls are anchors `a[data-testid="episodes-playbutton"][role="button"]` whose `href` points to a **separate playback detail route** such as `/detail/<playId>?autoplay=1&t=<offset>&ref_=...`, while the visible URL remains the browse detail. The play-control label is `Play S<N> E<M>` (or `Resume S<N> E<M>` once watched); each row has its own playId. The label and the row heading (`1. Persuader`) are the durable identity signals; the playId is session/media-specific and is not durable identity.
- The main play action `a[data-testid="dp-atf-play-button"][role="button"]` (inside `div.dv-dp-node-playback`) points at the same kind of playback detail route and carries a `Play`/`Resume` label for the season's current/first episode. It is the approved button placement anchor, not a playback target.
- Manual native clicks on episode-row play controls started the **episode video directly**: player opened with matching `.atvwebplayersdk-episode-info` metadata and a `<video>` at `readyState: 4` with advancing `currentTime` (episode durations 2583–3341 s).
- The loading overlay `.atvwebplayersdk-loading-overlay[role="status"]` is a **permanent structural element**: `display:flex`, `visibility:visible`, `opacity:1`, `z-index:1000`, `pointer-events:none`, empty text, containing only an empty `<span>`. It never removes during or after playback and must not gate confirmation.
- Two extension rolls opened the player with matching metadata but autoplayed the **trailer** (30–122 s) while the real episode sat loaded (`readyState: 4`) and paused at 0 — the player was already open from the season-navigation transition, and Prime treated the episode-row click as a trailer preview into the open player. Closing the player first makes the same click start the episode.
- A player `<video>` with `readyState >= 3` (data available), not `ended`, together with the player root and matching metadata, is the confirmed ready-state predicate.

Not yet observed:

- Resume/start-over behavior and timeline selectors.
- Whether all Prime-native content uses the same detail/episode hooks.
- Root replacement timing and lazy loading beyond the supplied eight-row season.
- Behavior and stable markers for unavailable/rental/channel/bonus items beyond the observed `COMING SOON` rows.
- A completed player-ready predicate after native playback in a session where the player does not auto-resume.

These observations are evidence only. They become normative after the Prime provider contract and implementation phase are approved.
