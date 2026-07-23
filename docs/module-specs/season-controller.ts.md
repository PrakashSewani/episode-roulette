# season-controller.ts — Netflix Season Interaction

## Purpose

Provide one shared, abortable implementation for enumerating Netflix seasons, activating a season, waiting for a verified transition, and expanding the complete episode list. Discovery and playback both use this module.

---

## Responsibilities

1. Detect the supported implicit-season or Netflix custom-dropdown strategy
2. Enumerate durable `SeasonDescriptor` values
3. Activate a requested season without duplicating clicks when it is already active
4. Verify season transitions using active identity and changed episode content
5. Expand Netflix's initially truncated episode section
6. Validate stable and expected episode counts
7. Propagate `AbortError` without converting cancellation into failure

This module does not parse episode metadata, aggregate catalogs, cache results, select episodes, or click an episode row.

---

## API

```typescript
import { SeasonDescriptor } from '../types'

export function getValidEpisodeRows(root: ParentNode): HTMLElement[]

export function enumerateSeasons(
  titleRoot: HTMLElement,
  episodeSelector: HTMLElement,
  deadline: number,
  signal: AbortSignal,
): Promise<SeasonDescriptor[]>

export function getActiveSeasonKey(
  episodeSelector: ParentNode,
): string | null

export function activateSeason(
  titleRoot: HTMLElement,
  episodeSelector: HTMLElement,
  season: SeasonDescriptor,
  deadline: number,
  signal: AbortSignal,
): Promise<void>

export function expandAndValidateSeason(
  episodeSelector: HTMLElement,
  season: SeasonDescriptor,
  deadline: number,
  signal: AbortSignal,
): Promise<HTMLElement[]>
```

`deadline` is an absolute `performance.now()` timestamp owned by the caller. Controller functions never create or extend it.

`getValidEpisodeRows()` queries `EPISODE_ROW` within `root`, de-duplicates matches from selector fallbacks, and returns only connected, visible `HTMLElement` rows with `role="button"`, preserving DOM order. It is synchronous and is the sole implementation of structural episode-row validity. `detector.ts`, controller operations, and discovery use it rather than duplicating the predicate.

---

## Enumeration

### Implicit Season

If valid episode rows exist and `SEASON_DROPDOWN_TOGGLE` does not exist, return one descriptor:

```typescript
{
  key: 'implicit',
  label: 'Episodes',
  seasonNumber: null,
  expectedEpisodeCount: null,
}
```

`getActiveSeasonKey()` returns `implicit` when valid episode rows exist and no supported season control exists. The implicit label is always `Episodes`.

### Netflix Custom Dropdown

1. Resolve the toggle within `episodeSelector`.
2. If it is closed, click it and wait for `SEASON_DROPDOWN_MENU`.
3. Query the menu within `titleRoot`. Live inspection confirmed the menu is inside the active detail-modal root; callers must not query the full document.
4. Parse all currently rendered `SEASON_DROPDOWN_ITEM` elements.
5. Ignore only explicitly known non-season actions such as `See All Episodes`.
6. Require at least one descriptor and unique normalized keys.
7. Close the menu by clicking the toggle if it remains open after enumeration.

Enumeration is asynchronous because opening and rendering the menu are Netflix DOM interactions. Every wait receives `signal`.

The first release supports a fully rendered menu. If a future Netflix layout virtualizes or incrementally loads season menu items, enumeration must fail safely until that layout is observed and documented.

### English Label Parsing

First-release traversal supports English Netflix UI only.

- Read item `innerText` when available, otherwise `textContent`, Unicode-normalize with `NFKC`, split on line breaks, trim each line, collapse Unicode whitespace runs to one ASCII space, and discard blank lines.
- A season item is accepted when its first normalized line matches `Season <positive integer>` case-insensitively.
- The key is `season <integer>` and the display label preserves the trimmed first line.
- `seasonNumber` is the parsed positive integer.
- `expectedEpisodeCount` is optional and parsed only from a later complete normalized line matching `(<positive integer> Episode)` or `(<positive integer> Episodes)` case-insensitively. A combined line such as `Season 7 (24 Episodes)` is unsupported and fails enumeration.
- `See All Episodes` is ignored as the only currently documented non-season action.
- Duplicate keys fail enumeration.
- Any other selectable item that does not match the supported season form fails enumeration as an unsupported layout. Labels such as specials, volumes, and parts must never be silently ignored because that could produce a partial catalog.

If no valid season descriptors remain after filtering, enumeration fails. Unsupported Netflix UI languages are outside first-release scope.

Toggle identity uses the same text extraction and first-line normalization. A toggle matches an explicit descriptor only when its parsed canonical key equals `season.key`.

---

## Activation

Activation has two branches:

### Already Active

If `getActiveSeasonKey(episodeSelector) === season.key`, do not click the dropdown. Proceed directly to expansion and completeness validation. Episode content is not required to change in this branch.

For `season.key === 'implicit'`, activation succeeds without clicking only when valid episode rows still exist and no supported season control exists. A cached implicit season paired with a live explicit control, or cached explicit season paired with a live implicit layout, is a cache-validation mismatch during playback.

### Switch Required

1. Capture the current episode-content snapshot as `JSON.stringify()` of the ordered tuples `[row.getAttribute('aria-label') ?? '', normalizeWhitespace(row.textContent ?? ''), index]` for all structurally valid rows. Snapshot equality is exact string equality; DOM node identity is not used.
2. Open the dropdown.
3. Re-query the menu and requested item; never retain menu-item elements from enumeration.
4. Click the uniquely matching item.
5. Wait until the toggle identifies `season.key`.
6. Require the episode-content snapshot to differ from the previous season.

Waiting for any episode row is never sufficient.

---

## Expansion and Stability

The traverser or navigator supplies one absolute five-second deadline for a complete season attempt. Enumeration has its own initial five-second attempt deadline. For a season, activation and expansion share the same deadline; controller calls do not reset it. A discovery retry receives one new five-second deadline. `AbortError` is immediate and bypasses retry.

For each season attempt:

1. If `SECTION_EXPAND` exists, click it once.
2. Require the control to disappear.
3. Observe `episodeSelector` with `{ childList: true, subtree: true, attributes: true }`. A relevant mutation is a child-list change or an attribute change to `class`, `style`, `hidden`, `aria-hidden`, or `role` on the selector subtree. After the latest relevant mutation, require the ordered valid-row snapshot and count to remain unchanged across two consecutive animation frames before the deadline.
4. If `expectedEpisodeCount` is non-null, require an exact count match.
5. Return the current live rows, all of which must satisfy the centralized valid-row definition.

If the expand control persists or reappears, or count validation fails, the season attempt fails. The traverser owns the one-retry wrapper.

Controller failures use `SeasonControllerError` reasons from `types.ts`. During playback, `season-missing`, `strategy-mismatch`, `active-season-mismatch`, and `count-mismatch` prove cached metadata stale. `render-timeout`, `transition-timeout`, and `expansion-failed` are structural playback failures. `unsupported-layout` fails discovery before a complete catalog exists.

---

## Testing

- Unit test: Implicit-season descriptor
- Unit test: Async dropdown enumeration filters non-season actions
- Unit test: Duplicate season keys fail enumeration
- Unit test: Already-active season performs no dropdown click
- Integration test: Switched season requires active-key and content change
- Integration test: Menu queries remain scoped to the title root
- Integration test: Abort closes waits without further clicks
- Integration test: Expansion clicks once and requires disappearance plus stable count
