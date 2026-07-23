# episode-identity.ts — Episode Identity

## Purpose

Provide deterministic, pure parsing and matching rules shared by episode discovery and playback re-resolution.

---

## Responsibilities

1. Normalize episode titles identically during discovery and playback
2. Parse an optional episode number from a Netflix row
3. Convert a live row into a comparable identity
4. Resolve durable `Episode` metadata to one unique current row
5. Never click elements or retain DOM references

---

## API

```typescript
import { Episode, EpisodeRowIdentity } from '../types'

export function normalizeEpisodeTitle(text: string): string

export function parseEpisodeRowIdentity(
  row: HTMLElement,
  episodeIndex: number,
): EpisodeRowIdentity

export function resolveEpisodeRow(
  episode: Episode,
  rows: HTMLElement[],
): HTMLElement | null
```

---

## Title Normalization

`normalizeEpisodeTitle(text)` performs these steps in order:

1. Unicode normalize with `NFKC`.
2. Trim leading and trailing whitespace.
3. Collapse every internal Unicode whitespace run to one ASCII space.
4. Lowercase with `toLocaleLowerCase('en-US')` for deterministic first-release behavior.
5. Preserve punctuation and symbols; do not remove characters that could distinguish titles.

An empty normalized title and the normalized placeholder `unknown episode` are not usable title identities.

---

## Source Precedence

### Title

1. Non-empty row `aria-label`
2. `EPISODE_TITLE` selector text within the row
3. Display value `Unknown Episode`, with `normalizedTitle: null`

### Episode Number

Query every selector in `EPISODE_NUMBER.selectors` within the row rather than stopping at the first successful selector. De-duplicate identical matched elements, normalize each element's complete `textContent`, and parse every successful candidate. The verified `.titleCard-title_index` fallback is one of those centralized row-scoped selectors, not a separate hardcoded query.

If no source parses, use `null`. If every parsed source agrees, use that positive integer. If parsed sources disagree, use `null` and set `episodeNumberConflict: true`. Selector order is diagnostic only after conflict collection; it must not hide disagreement.

Accepted number formats are a whole positive integer optionally prefixed by `E`, `Ep`, `Ep.`, or `Episode`, ignoring case and surrounding whitespace. Parsing must consume the complete candidate text; numbers embedded in titles or descriptions are ignored.

A number conflict disqualifies that row from number-plus-title matching but not from unique normalized-title matching.

---

## Resolution Order

1. Unique non-conflicted episode-number plus normalized-title match
2. Unique normalized-title match when title identity is usable
3. Stored `episodeIndex` only when:
   - No stronger usable identity exists
   - The live row count equals `discoveredSeasonEpisodeCount`
   - The indexed row exists

At each eligible tier:

- Exactly one match succeeds immediately.
- Zero matches advance to the next eligible tier.
- Multiple matches fail immediately and return `null`; do not use a weaker tier to break ambiguity.
- If the final eligible tier has zero matches, return `null`.

A row with a number conflict may participate in unique normalized-title matching, but index fallback is forbidden for a selected episode whose live identity is conflicted. The caller must fail safely and never guess.

---

## Testing

- Unit test: Unicode, whitespace, case, and punctuation normalization
- Unit test: `aria-label` title precedence
- Unit test: Accepted complete episode-number formats
- Unit test: Numbers in descriptions are ignored
- Unit test: Conflicting number sources disable strong number matching
- Unit test: Ambiguous title returns null
- Unit test: Index fallback requires equal complete-season counts
