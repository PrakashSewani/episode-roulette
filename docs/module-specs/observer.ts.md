# observer.ts — SPA Navigation Detection

## Purpose

Detect when the user navigates to or from a TV series page on Netflix without requiring page reloads.

---

## Responsibilities

1. Watch for URL changes via multiple strategies
2. Emit `series-entered` events when navigating to a series page
3. Emit `series-left` events when navigating away
4. Debounce rapid navigation events

---

## Detection Strategies

### 1. URL Polling

- Poll `window.location.href` every 500ms
- Compare with last known URL
- If changed, evaluate new URL

### 2. MutationObserver

- Observe `document.body` with `{ childList: true, subtree: true }`
- Trigger URL evaluation on significant DOM changes (debounced to 300ms)
- Netflix re-renders main content area on navigation

### 3. History Events

- Listen to `popstate` events (back/forward navigation)
- Listen to `hashchange` events (hash-based routing)
- Trigger URL evaluation immediately on these events

---

## Event Emission

```typescript
interface NavigationEvent {
  type: 'series-entered' | 'series-left'
  seriesId?: string
  url: string
}
```

Events are emitted through a simple callback system:

```typescript
type NavigationCallback = (event: NavigationEvent) => void

function onStart(callback: NavigationCallback): void
function onStop(): void
```

---

## API

```typescript
/**
 * Start watching for navigation changes.
 * Calls `callback` whenever the user navigates to/from a series.
 */
export function onStart(callback: NavigationCallback): void

/**
 * Stop watching for navigation changes.
 * Cleans up all observers and intervals.
 */
export function onStop(): void
```

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Rapid navigation (clicking multiple series quickly) | Debounce: wait 300ms after last change before emitting |
| Page load (initial series page) | Emit `series-entered` immediately if URL matches |
| Netflix loading spinner (partial navigation) | Ignore — wait for URL to stabilize |
| Browser back/forward | Handled by `popstate` listener |

---

## Testing

- Unit test: URL pattern matching logic
- Integration test: Mock `window.location`, verify events emitted
- Manual test: Navigate Netflix SPA, verify console logs
