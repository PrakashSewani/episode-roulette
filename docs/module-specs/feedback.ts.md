# feedback.ts — Loading and Error States

## Purpose

Provide visual feedback to the user during episode discovery and when errors occur.

---

## Responsibilities

1. Show loading state on button during episode discovery
2. Show error toast when discovery fails
3. Provide user-friendly error messages

---

## Loading Feedback

During episode discovery, the button shows a loading state:

```typescript
import { ButtonState } from '../types'

controller.setState('loading')
```

This triggers CSS changes defined in `styles.ts`:
- Reduced opacity
- Spinning/waiting cursor
- Animated dots after text

---

## Error Feedback

When something goes wrong, show an error state on the button:

```typescript
controller.setState('error')
// Button shows warning icon, tooltip on hover explains the issue
```

### Error Toast (Optional)

For more detailed errors, show a temporary toast notification:

```typescript
function showErrorToast(message: string, duration = 5000): void {
  const toast = document.createElement('div')
  toast.className = 'ep-roulette-toast'
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

---

## Error Messages

Use friendly, non-technical messages:

| Error | Message |
|-------|---------|
| No seasons found | "Could not find seasons for this show" |
| Season click failed | "Could not load season episodes" |
| No episodes found | "No episodes found" |
| Play button not found | "Could not find play button" |
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

/**
 * Remove any existing toast.
 */
export function dismissToast(): void
```

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Multiple errors in quick succession | Only show latest toast |
| Toast still visible when new error occurs | Replace existing toast |
| User navigates away | Remove toast |

---

## Testing

- Manual test: Loading state appears during discovery
- Manual test: Error toast shows on failure
- Manual test: Toast auto-dismisses after timeout
- Manual test: Toast is styled consistently with Netflix
