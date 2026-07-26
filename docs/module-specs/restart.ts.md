# restart.ts — Seek to Beginning

## Purpose

After a random roll reaches Netflix playback (`/watch/`), start the episode near the beginning instead of resuming from the last watched position.

---

## Responsibilities

1. Wait for the Netflix player `<video>` element after navigation (readiness and progress only).
2. After settle, simulate one user-like scrubber click at the start of the player timeline.
3. Optionally retry that scrubber click once if still mid-episode.
4. Abort cleanly if the user navigates away or the content script stops.
5. Never surface user-facing errors — best-effort; playback is already in progress.
6. **Never** assign `video.currentTime` or thrash `pause()`/`play()` on the media element (live M7375).

---

## API

```typescript
/**
 * Seek the Netflix player to the beginning after a random roll.
 * @param signal - Cancels waits and scrub attempts
 */
export function seekToBeginning(signal: AbortSignal): Promise<void>
```

Resolves when the restart attempt finishes (success, missing timeline, or no-op). Exits silently on abort.

---

## Strategy

Netflix error **M7375** is triggered by extension interference with the media element, including direct `HTMLMediaElement.currentTime` assignment. Live smoke confirmed even a single gentle `currentTime = 0` can produce "Pardon the interruption".

**Forbidden:** setting `video.currentTime`, continuous event-driven re-seek loops, multi-seek thrashing.

**Allowed approach:** after playback settles, simulate **one** user-like pointer interaction on Netflix's timeline scrubber at the start of the bar.

1. Poll for `VIDEO_PLAYER` up to a deadline (readiness/progress only; do not mutate it).
2. Wait for settle (~2000 ms) so Netflix finishes auto-resume and controls can accept input.
3. If `currentTime` is below the resume threshold (~5 s), exit without interacting (already near start). Live smoke: absolute-left scrub often lands ~2 s.
4. Reveal player controls with a synthetic `mousemove` over the video.
5. Resolve `PLAYER_TIMELINE` via centralized selectors; require a connected element with a non-zero layout box.
6. Dispatch a single pointer sequence (`pointerdown` → `mousedown` → `pointerup` → `mouseup` → `click`) at the **absolute left edge** of the timeline hit box (`left + 1px`, not a percentage). Live smoke (2026-07-26): a 1%-width click landed ~13 s into the episode.
7. Wait ~2 s. If `currentTime` is still above the resume threshold, perform **at most one** retry at the same absolute left edge. Do not retry when already near start.
8. Exit silently on abort or missing timeline.

If the timeline cannot be found, exit without touching the media element. Prefer failing open (resume position) over M7375.

---

## Why not `currentTime`

Live evidence (2026-07-26):

- Restart armed correctly after random roll
- Video found at resume position, `readyState: 4`, playing
- Direct seek to 0 succeeded briefly, then Netflix showed M7375
- Scrubber click at absolute left edge moved playback near the start without M7375

---

## Edge Cases

| Case | Behavior |
|------|----------|
| No video element appears | Exit after timeout |
| Video already near start after settle | No-op |
| Timeline scrubber missing | Exit; leave resume position |
| Netflix resume mid-episode | One scrubber click at start |
| Still mid-episode after first click | At most one delayed scrubber re-click |
| User navigates away | Abort signal exits silently |

---

## Testing

- Unit test: after settle, performs timeline pointer click when video has resume progress
- Unit test: never assigns `video.currentTime`
- Unit test: no-op when already near the beginning
- Unit test: no-op when timeline is missing
- Unit test: abort during settle exits without clicking
