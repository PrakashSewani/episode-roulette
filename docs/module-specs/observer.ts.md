# observer.ts — SPA Navigation Detection

## Purpose

Report Netflix SPA route and DOM changes without deciding whether the active title is a movie or series.

---

## Responsibilities

1. Watch for URL changes via multiple strategies
2. Report route changes, including `jbv` changes on the same pathname
3. Temporarily observe page DOM while the orchestrator locates title details
4. Observe a supplied title-details root after it is found
5. Use a narrow page-level liveness observer to detect root or ancestor removal
6. Associate DOM notifications with the orchestrator's active generation
7. Debounce DOM notifications and clean up every observer

DOM notifications use a 50 ms trailing debounce. Each new relevant mutation replaces the pending timer for the current observation generation.

---

## Detection Strategies

### 1. URL Polling

- Poll `window.location.href` every 500ms
- Compare with last known URL
- If changed, evaluate new URL
- Treat changes to the `jbv` query parameter as title-detail navigation even when the pathname does not change

### 2. Temporary Root Discovery Observer

- Observe `document.body` only while an active title identity exists and its details root has not been found
- Notify the orchestrator of debounced DOM changes so it can retry `TITLE_DETAILS_ROOT`
- Debounce notifications by 50 ms
- Disconnect immediately after the root is found, the title context closes, or the observer stops

### 3. Scoped Title Observer

- Observe the supplied title-details root with `{ childList: true, subtree: true }`
- Emit debounced `title-dom-changed` notifications
- Debounce notifications by 50 ms
- Never classify the title or query episode selectors
- Record the root's current parent as `expectedParent`
- Separately observe `document.body` with `{ childList: true, subtree: true }` for liveness only
- On each liveness mutation, perform only `root.isConnected` and `root.parentElement === expectedParent` checks; do not run selectors or classification from this observer
- If either check fails, emit `title-root-removed`
- Disconnect both scoped observers together

### 4. History Events

- Listen to `popstate` events (back/forward navigation)
- Listen to `hashchange` events (hash-based routing)
- Trigger URL evaluation immediately on these events

---

## Event Emission

```typescript
type PageChangeEvent =
  | { type: 'route-changed'; url: string }
  | { type: 'title-dom-changed'; url: string; generation: number }
  | { type: 'title-root-removed'; url: string; generation: number }
```

Events are emitted through a simple callback system:

```typescript
type PageChangeCallback = (event: PageChangeEvent) => void

function onStart(callback: PageChangeCallback): void
function observeTitleRoot(root: HTMLElement, generation: number): void
function observeForTitleRoot(generation: number): void
function clearTitleObservation(): void
function onStop(): void
```

---

## API

```typescript
/**
 * Start watching for navigation changes.
 * Calls `callback` for neutral Netflix route and DOM changes.
 */
export function onStart(callback: PageChangeCallback): void

/** Temporarily watch the page while the title-details root is rendering. */
export function observeForTitleRoot(generation: number): void

/** Replace root-discovery observation with scoped title-details observation. */
export function observeTitleRoot(root: HTMLElement, generation: number): void

/**
 * Disconnect temporary root-discovery and scoped title observers, including
 * pending debounced DOM callbacks. Keep route polling/history listeners active.
 */
export function clearTitleObservation(): void

/**
 * Stop watching for navigation changes.
 * Calls clearTitleObservation(), then removes route polling and history listeners.
 */
export function onStop(): void
```

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Rapid navigation (clicking multiple titles quickly) | Emit the latest route and discard pending DOM notifications for the old context |
| Initial page load | Emit one `route-changed` event; do not classify the page |
| Netflix loading spinner or partial render | Scoped observer reports changes; orchestrator decides whether to re-run detection |
| Browser back/forward | Handled by `popstate` listener |
| Browse overlay opens, changes, or closes through `jbv` | Emit `route-changed` even if the pathname is unchanged |
| Details root is replaced during render | Emit `title-root-removed`, disconnect, and let orchestration locate the replacement |
| Debounced DOM notification belongs to an old generation | Discard it before callback delivery |
| Root or one of its ancestors is removed | Liveness observer detects `isConnected === false` |
| Root parent changes while root remains connected | Treat as root replacement and emit `title-root-removed` |

---

## Testing

- Unit test: URL changes and `jbv` changes emit neutral route events
- Unit test: Switching to scoped observation disconnects the body observer
- Unit test: Root removal emits cleanup notification
- Unit test: Direct root and ancestor removal are detected by the liveness observer
- Unit test: `clearTitleObservation()` preserves route polling and history listeners
- Unit test: Pending debounced events for an old generation are discarded
- Integration test: Mock `window.location` and DOM mutations, verify events emitted
- Manual test: Navigate Netflix SPA, verify console logs
