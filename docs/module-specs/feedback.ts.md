# feedback.ts — Loading and Error States

## Purpose

Own status/error toast DOM and timer lifecycle. Button states and loading animation are owned by `button.ts`; all CSS is owned by `styles.ts`.

---

## Responsibilities

1. Show one five-second status toast immediately after a random episode is selected
2. Show one error toast when a user-requested operation fails
3. Render an optional action link on an error toast and keep that toast on screen until the user acts on it
4. Replace or dismiss existing toast state safely
5. Clear all toast timers during replacement, retry, navigation, and teardown
6. Provide user-friendly messages

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
showErrorToast(message, { action: { label: 'Report', href: reportUrl } })
```

The error button remains clickable. A retry dismisses any existing toast before changing the button to loading.

The report URL is built by `report.ts`. `feedback.ts` renders whatever `href` it is given and never constructs report URLs itself.

## Selection Feedback

Immediately after `pickRandom()` and the final current-context guard, `content.ts` shows a polite status toast before season reactivation begins. The message includes durable selection information:

```text
Selected Season 2, Episode 5: The Episode Title
```

For named seasons, use the season label directly. If `episodeNumber` is unavailable, use the one-based discovered position (`episodeIndex + 1`) and prefix it with `Episode`. If the title is `Unknown Episode`, omit the title suffix. A later playback or discovery failure replaces this toast with the exact error toast.

### Error Toast

For more detailed errors, show a toast notification. Error toasts are built from DOM nodes, never `innerHTML`, so the message and the action label are always treated as text.

```typescript
export interface ToastAction {
  label: string
  href: string
}

export interface ErrorToastOptions {
  /** Auto-dismiss delay. Ignored when `action` is present. */
  duration?: number
  /** Optional link, for example the failure report form. */
  action?: ToastAction
}

export function showErrorToast(message: string, options?: ErrorToastOptions): void
```

DOM contract:

```html
<div class="ep-roulette-toast" data-kind="error" role="alert" aria-live="assertive">
  <span class="ep-roulette-toast-text">Could not load all seasons. Try again.</span>
  <a class="ep-roulette-toast-action" href="https://episode-roulette.prakashsewani.com/report?…"
     target="_blank" rel="noopener noreferrer">Report</a>
  <button type="button" class="ep-roulette-toast-close" aria-label="Dismiss notification">✕</button>
</div>
```

Rules:

- The action link always opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"`; the provider page must never navigate away.
- The close button calls `dismissToast()`.
- Clicking the action link calls `dismissToast()` after the navigation has been initiated, so the snackbar does not linger once the user has acted.
- `showStatusToast` never renders an action or a close button; its DOM is the message text alone.

### Toast Lifetime

| Toast | Auto-dismiss |
|---|---|
| Status toast | 5000 ms (default) plus the 300 ms exit animation |
| Error toast without `action` | `duration ?? 5000` ms plus the exit animation |
| Error toast with `action` | never — it persists until the user clicks the action, clicks close, a newer toast replaces it, or `dismissToast()` runs during navigation cleanup |

A persistent toast keeps the same token and replacement behavior as any other toast: showing a new toast dismisses the old one, and stale timers never remove a newer toast. A persistent toast leaves no pending timer behind.

### Toast CSS

```css
.ep-roulette-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(560px, calc(100vw - 32px));
  padding: 12px 12px 12px 20px;
  background: #333;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
  animation: ep-roulette-toast-in 0.3s ease;
}

.ep-roulette-toast-text {
  flex: 1 1 auto;
}

.ep-roulette-toast-action { /* snackbar report link */ }

.ep-roulette-toast-close { /* 24px ghost dismiss button */ }

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
 * @param options.duration - Auto-dismiss delay (ms, default 5000); ignored when an action is present
 * @param options.action - Optional action link, for example the failure report form
 */
export function showErrorToast(message: string, options?: ErrorToastOptions): void

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
| Error toast carrying a report action | Persists until the user clicks the action, clicks close, or navigation cleanup runs; no dismiss timer is armed |
| User clicks the report link | Opens in a new tab, then dismisses the snackbar; the provider page is untouched |
| User clicks close | Dismiss the snackbar immediately |
| User navigates away | Remove toast |
| User clicks retry while toast is visible | Dismiss toast immediately, then start loading |
| Operation is aborted by navigation | Show no toast and do not enter error state |

---

## Testing

- Unit test: default toast duration is 5000 ms when no action is present
- Unit test: an error toast with an action never auto-dismisses, even well past the default duration
- Unit test: the action renders the supplied `href` with `target="_blank"` and `rel="noopener noreferrer"`
- Unit test: clicking close dismisses the snackbar
- Unit test: clicking the action dismisses the snackbar without navigating the current page
- Unit test: both the message and the action label render as text, never as HTML
- Unit test: retry dismisses an existing toast
- Unit test: abort does not show a toast
- Unit test: stale timer from a replaced toast cannot remove the current toast
- Manual test: error snackbar is styled consistently with the provider page
