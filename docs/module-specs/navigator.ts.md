# navigator.ts — Playback Navigation

## Purpose

Trigger Netflix-native playback of a selected episode by simulating user interaction.

---

## Responsibilities

1. Take a selected `Episode` object
2. Trigger playback using Netflix's own UI
3. Fall back to URL navigation if click doesn't work
4. Behave exactly as if the user manually selected the episode

---

## API

```typescript
import { Episode } from '../types'

/**
 * Navigate to and start playing the selected episode.
 * @param episode - The episode to play
 */
export function playEpisode(episode: Episode): void
```

---

## Navigation Strategy

### Primary: Click Simulation

```typescript
export function playEpisode(episode: Episode): void {
  // Try clicking the episode's DOM element
  if (episode.element && document.body.contains(episode.element)) {
    episode.element.click()
    return
  }

  // Fallback: navigate to URL
  navigateToUrl(episode.url)
}
```

Clicking the element triggers Netflix's full playback flow:
- Loading screen
- Buffering
- Resume from last position (if applicable)
- Credits/next episode UI

### Fallback: URL Navigation

If the DOM element reference is stale (page re-rendered):

```typescript
function navigateToUrl(url: string): void {
  if (url && url !== window.location.href) {
    window.location.href = url
  }
}
```

---

## Why Click Over URL

| Approach | Pros | Cons |
|----------|------|------|
| Click | Triggers full Netflix flow, resume from position | Element may become stale |
| URL | Always works | May bypass resume, different Netflix flow |

We prefer click because it's more native. URL is only a fallback.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Element reference stale | Fall back to URL navigation |
| URL is empty or same as current | Log warning, do nothing |
| Netflix shows confirmation dialog | Let it appear (normal Netflix behavior) |
| Episode is behind a paywall | Let Netflix handle it (not our concern) |

---

## Testing

- Unit test: `playEpisode` calls `.click()` on element
- Unit test: Falls back to URL when element not in DOM
- Manual test: Clicking button starts real Netflix playback
- Manual test: Episode resumes from last watched position
