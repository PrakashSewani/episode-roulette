# feedback.ts — Loading and Error States

## Purpose

Own status/error toast DOM and timer lifecycle. Button states and loading animation are owned by `button.ts`; all CSS is owned by `styles.ts`.

---

## Responsibilities

1. Show one five-second status toast immediately after a random episode is selected
2. Show one five-second error toast when a user-requested operation fails
3. Replace or dismiss existing toast state safely
4. Clear all toast timers during replacement, retry, navigation, and teardown
5. Provide user-friendly messages

---

## Button Feedback Boundary

`content.ts` commands button states through `ButtonController`. `feedback.ts` does not set button state or create a loading spinner:

```typescript
import { ButtonState } from '../types'

controller.setState('loading')
```

`button.ts` applies state attributes and `styles.ts` renders:
- Reduced opacity
- Spinning/waiting cursor
- Animated dots after text

---

## Error Feedback

When something goes wrong, `content.ts` updates the button and separately calls this module for the toast:

```typescript
controller.setState('error', message)
showErrorToast(message)
```

The error button remains clickable. A retry dismisses any existing toast before changing the button to loading.

## Selection Feedback

Immediately after `pickRandom()` and the final current-context guard, `content.ts` shows a polite status toast before season reactivation begins. The message includes durable selection information:

```text
Selected Season 2, Episode 5: The Episode Title
```

For named seasons, use the season label directly. If `episodeNumber` is unavailable, use the one-based discovered position (`episodeIndex + 1`) and prefix it with `Episode`. If the title is `Unknown Episode`, omit the title suffix. A later playback or discovery failure replaces this toast with the exact error toast.

### Error Toast

For more detailed errors, show a temporary toast notification. The required default duration is 5000ms:

```typescript
function showErrorToast(message: string, duration = 5000): void {
  const toast = document.createElement('div')
  toast.className = 'ep-roulette-toast'
  toast.setAttribute('role', 'alert')
  toast.setAttribute('aria-live', 'assertive')
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('ep-roulette-toast-exit')
    setTimeout(() => toast.remove(), 300)
  }, duration)
}
```

### Toast CSS

```css
.ep-roulette-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #333;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
  animation: ep-roulette-toast-in 0.3s ease;
}

.ep-roulette-toast-exit {
  animation: ep-roulette-toast-out 0.3s ease forwards;
}

@keyframes ep-roulette-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes ep-roulette-toast-out {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(20px); }
}
```

This CSS is implemented and injected by `styles.ts`; it is shown here only to document the visual contract.

---

## Error Messages

Use friendly, non-technical messages:

| Error | Message |
|-------|---------|
| Season failed after retry | "Could not load all seasons. Try again." |
| No episodes found | "No episodes found" |
| Selected episode cannot be resolved | "Could not open the selected episode. Try again." |
| Playback did not start | "Could not start playback. Try again." |
| General failure | "Something went wrong. Try again." |

---

## API

```typescript
/**
 * Show an error toast notification.
 * @param message - User-friendly error message
 * @param duration - How long to show (ms, default 5000)
 */
export function showErrorToast(message: string, duration?: number): void

/** Show a polite selection/status toast notification. */
export function showStatusToast(message: string, duration?: number): void

/**
 * Remove any existing toast.
 */
export function dismissToast(): void
```

## Timer Ownership

`feedback.ts` owns the current toast element, dismiss timer, exit-animation timer, and monotonically increasing toast token.

Before showing or dismissing a toast, clear all prior timer IDs and invalidate the prior token. Timer callbacks verify their token before mutating DOM, so an older toast cannot remove or alter a newer toast.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Multiple errors in quick succession | Only show latest toast |
| Selection followed by playback failure | Replace selection status with the failure toast |
| Toast still visible when new error occurs | Replace existing toast |
| User navigates away | Remove toast |
| User clicks retry while toast is visible | Dismiss toast immediately, then start loading |
| Operation is aborted by navigation | Show no toast and do not enter error state |

---

## Testing

- Manual test: Loading state appears during discovery
- Manual test: Error toast shows on failure
- Manual test: Toast auto-dismisses after timeout
- Manual test: Toast is styled consistently with Netflix
- Unit test: Default toast duration is 5000ms
- Unit test: Retry dismisses an existing toast
- Unit test: Abort does not show a toast
- Unit test: Stale timer from a replaced toast cannot remove the current toast
