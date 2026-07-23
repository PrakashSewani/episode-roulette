# navigator.ts — Playback Navigation

## Purpose

Re-resolve a selected episode from durable metadata and trigger Netflix-native playback through the current live row.

---

## Responsibilities

1. Take a selected `Episode` object
2. Re-activate the selected episode's season
3. Expand and validate the complete live episode list
4. Uniquely match the selected metadata to one live row
5. Click only that verified row

---

## API

```typescript
import { Episode } from '../types'

/**
 * Resolve and start playing the selected episode through Netflix's live UI.
 * @param episode - The episode to play
 * @param root - Active Netflix title-details root
 * @param signal - Cancels season activation and episode resolution
 * @param assertCurrent - Throws AbortError if title/generation is stale
 */
export function playEpisode(
  episode: Episode,
  root: HTMLElement,
  signal: AbortSignal,
  assertCurrent: () => void,
): Promise<void>
```

The promise rejects with:

- `CacheValidationMismatchError` when live Netflix season identity or complete row count proves the catalog stale
- `PlaybackResolutionError` when the live catalog is structurally consistent but the selected episode is missing, ambiguous, or cannot be activated safely
- Platform `AbortError` when navigation or generation invalidates the operation

`toSeasonDescriptor(episode)` returns:

```typescript
{
  key: episode.seasonKey,
  label: episode.seasonLabel,
  seasonNumber: episode.seasonNumber,
  expectedEpisodeCount: episode.discoveredSeasonEpisodeCount,
}
```

`season-controller.ts` reports typed `SeasonControllerError` reasons. Error mapping is exact:

- `season-missing`, `strategy-mismatch`, `active-season-mismatch`, or `count-mismatch` → `CacheValidationMismatchError`
- `render-timeout`, `transition-timeout`, `expansion-failed`, `unsupported-layout`, or a consistent live catalog that cannot uniquely resolve the episode → `PlaybackResolutionError`
- Missing or ambiguous `EPISODE_SELECTOR` within the supplied active title root → `PlaybackResolutionError`; it is a live structural failure, not proof that cached catalog metadata changed
- Cancellation or stale generation → platform `AbortError`

---

## Navigation Strategy

### Re-Resolve and Click

```typescript
export async function playEpisode(
  episode: Episode,
  root: HTMLElement,
  signal: AbortSignal,
  assertCurrent: () => void,
): Promise<void> {
  const episodeSelector = requireEpisodeSelector(root)
  const season = toSeasonDescriptor(episode)
  const deadline = performance.now() + 5000
  await activateSeason(root, episodeSelector, season, deadline, signal)
  const rows = await expandAndValidateSeason(episodeSelector, season, deadline, signal)

  const row = resolveEpisodeRow(episode, rows)
  if (!row) {
    throw new PlaybackResolutionError(
      'Selected episode could not be resolved uniquely',
    )
  }

  signal.throwIfAborted()
  assertCurrent()
  row.click()
}
```

`requireEpisodeSelector(root)` resolves `EPISODE_SELECTOR` only within `root`, requires exactly one connected visible `HTMLElement`, and throws `PlaybackResolutionError` otherwise.

No asynchronous boundary may occur between `assertCurrent()` and `row.click()`.

Clicking the element triggers Netflix's full playback flow:
- Loading screen
- Buffering
- Resume from last position (if applicable)
- Credits/next episode UI

### Episode Resolution

`season-controller.ts` owns season activation and expansion. `episode-identity.ts` owns live row parsing and resolution, ensuring discovery and playback use identical rules.

Resolution order:

1. Unique match by parsed episode number and normalized title
2. Unique match by normalized title when the title is not `Unknown Episode`
3. The stored `episodeIndex`, only when the fully expanded live row count equals `discoveredSeasonEpisodeCount` and the selected episode had no stronger usable identity

If a step yields multiple candidates, inconsistent metadata, or a row-count mismatch, fail playback. Never guess between rows.

Row-count or season-identity differences that demonstrate cached catalog staleness throw `CacheValidationMismatchError`. `content.ts` responds by invalidating that series and performing one fresh complete discovery. Missing or ambiguous matching with otherwise consistent live season metadata throws `PlaybackResolutionError`, including after fresh discovery, and never triggers another rediscovery.

---

## Why Re-Resolve Over Stored Elements or URLs

| Approach | Pros | Cons |
|----------|------|------|
| Re-resolve and click | Uses Netflix's native flow and fresh DOM | Requires switching back to the selected season |
| Stored element | Simple click | Becomes stale during multi-season traversal |
| URL navigation | Would be durable if an episode URL existed | No episode anchor was observed; title URL cannot play the selected episode |

The core architecture has no URL fallback. Playback succeeds through a uniquely resolved live Netflix row or fails safely.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Selected season cannot be reactivated | Fail playback and show retryable error |
| Episode match is missing or ambiguous | Fail without clicking any row |
| Live season count differs from discovery | Fail because index identity is no longer safe |
| Netflix shows confirmation dialog | Let it appear (normal Netflix behavior) |
| Episode is behind a paywall | Let Netflix handle it (not our concern) |
| Operation aborts before final click | Exit silently and do not click |

---

## Testing

- Unit test: Reactivates the selected season and expands it before matching
- Unit test: Resolves a unique number-and-title match
- Unit test: Uses index only with equal complete-season counts and no stronger identity
- Unit test: Does not click when matching is ambiguous or inconsistent
- Unit test: Abort or stale-generation assertion prevents the final click
- Unit test: Live catalog mismatch is distinguishable from an ordinary playback-resolution failure
- Manual test: Clicking button starts real Netflix playback
- Manual test: Episode resumes from last watched position
