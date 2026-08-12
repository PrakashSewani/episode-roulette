# button.ts — UI Button Injection

## Purpose

Create and inject a "Random Episode" button that matches Netflix's design language.

---

## Responsibilities

1. Create button element with correct HTML structure
2. Insert button next to Netflix's Play button
3. Show immediate disabled spawn feedback while waiting for Netflix's Play button
4. Start the placed operation button in the ready state and handle state changes (ready, loading, error)
5. Provide idempotent removal for lifecycle cleanup owned by `content.ts`

Phase 3 injects the enabled ready button without registering an operation handler. Clicking it therefore leaves it ready and performs no product operation until the discovery/playback flow is wired in Phase 5. State-transition behavior remains fully implemented and unit-tested for later orchestration.

---

## Button Structure

```html
<button class="ep-roulette-btn" data-uia="random-episode-btn">
  <span class="ep-roulette-icon">🎲</span>
  <span class="ep-roulette-text">Random Episode</span>
</button>
```

---

## Placement Strategy

1. Append a disabled `Loading Episode Roulette...` indicator to the supplied active title-details root immediately
2. Ask the selected provider for a placement capability while the indicator remains visible
3. Remove the temporary indicator and let the provider place the ready operation button
4. If placement is unavailable, cancellation occurs, or placement is invalid, remove the temporary indicator without showing an error
5. Ensure both forms are visible and accessible

```typescript
const placement = await provider.waitForButtonPlacement(titleDetailsRoot, signal)
if (placement !== null) {
  placement.place(createButton())
}
```

The temporary indicator uses the same `data-uia="random-episode-btn"` ownership marker and `loading` visual state as the operation button, plus `data-phase="spawn"`. It is disabled, has `aria-disabled="true"`, `aria-busy="true"`, and `aria-label="Loading Episode Roulette"`, and never has a click handler. The placed operation button removes `data-phase` and starts in `ready`.

Phase 3 introduces only `resilientQuery()` and abortable `waitForElement()` in `dom-utils.ts` to support this scoped lookup. Other generic DOM waits remain Phase 4 work.

---

## API

```typescript
import { ButtonState } from '../types'

/**
 * Inject the Random Episode button into the active Netflix title-details root.
 * Returns null when the scoped Play button does not appear within 5 seconds.
 */
export function injectButton(
  root: HTMLElement,
  placementPromise: Promise<ButtonPlacement | null>,
  signal: AbortSignal,
): Promise<ButtonController | null>

interface ButtonController {
  /** Update button state and optional retryable error message. */
  setState(state: ButtonState, errorMessage?: string): void

  /** Read the current button state without changing it. */
  getState(): ButtonState

  /** Set click handler */
  onClick(handler: () => void): void

  /** Remove button from DOM */
  remove(): void
}
```

---

## Button States

### Ready

The button starts in this state immediately after injection. `ready` means the user may request a random episode; it does not imply that episode discovery has already run.

On click, the orchestration layer immediately changes the button to `loading` before beginning discovery or cache lookup.

```css
.ep-roulette-btn {
  opacity: 1;
  cursor: pointer;
}
.ep-roulette-btn:hover {
  filter: brightness(1.2);
}
```

### Loading

`setState('loading')` sets `disabled`, `aria-disabled="true"`, and `data-state="loading"`. The DOM click listener checks the current state and never invokes the registered handler while loading, including programmatic or keyboard-generated clicks. Returning to `ready` or `error` removes `disabled` and sets `aria-disabled="false"`.

```css
.ep-roulette-btn {
  opacity: 0.7;
  cursor: wait;
}
.ep-roulette-text::after {
  content: '...';
  animation: ep-roulette-dots 1.5s infinite;
}
```

### Error

The error state remains enabled and clickable. It persists until the user retries, the active title context changes, or the button is removed. Clicking in error state immediately performs `error → loading` and starts a fresh user-requested operation.

`setState('error', message)` sets `data-error` for the hover tooltip. Calling `setState('ready')` or `setState('loading')` removes stale error text.

For assistive technology, `setState('error', message)` also sets the button's `aria-label` to `Random Episode. Error: <message>`. Ready and loading restore `aria-label="Random Episode"`; loading additionally exposes `aria-busy="true"`, which is removed in other states. The CSS tooltip is supplementary and is not the only error communication.

```css
.ep-roulette-btn {
  opacity: 0.7;
  cursor: pointer;
}
.ep-roulette-btn::after {
  content: '⚠';
  margin-left: 4px;
}
```

---

## Cleanup

Button is removed when:
- The orchestrator invalidates or replaces the active title context
- The active title-details root is removed
- `button.remove()` is called

```typescript
// content.ts owns cleanup
function cleanupActiveTitle(): void {
  controller.remove()
}
```

---

## Styling

See `styles.ts.md` for CSS details. Button uses:
- Netflix's own CSS custom properties where available
- Dark background matching Netflix buttons
- Red accent color on hover
- Same border-radius, font-size, padding as Play button

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Play button not found | Don't inject button, log warning |
| Play button still rendering | Show one disabled lower-left spawn indicator inside the active title root |
| Spawn wait times out or aborts | Remove the indicator silently; timeout logs the existing warning |
| Module-owned button already exists in the same root | Return the existing connected controller |
| Orphan extension button exists without the module-owned controller | Remove the orphan and create one new controller |
| Netflix layout changes | Button may need repositioning (documented in selectors) |
| Multiple series pages quickly | Remove old button, inject new one |
| Repeated click while loading | Ignore; only one discovery/playback operation may run |
| Click while in error state | Transition to loading and start a fresh attempt |

`injectButton()` queries only within `root`. Timeout resolves `null`; cancellation propagates `AbortError`. `content.ts` verifies the operation context immediately before retaining the returned controller.

`button.ts` maintains at most one module-owned `{ root, element, controller }` record. It returns that controller only when the element is still connected to the same supplied root. `content.ts` remains the lifecycle owner and calls `remove()` during context cleanup.

---

## Testing

- Unit test: Button creation and DOM insertion
- Unit test: Play-button lookup is scoped to the supplied title root
- Unit test: A disabled spawn indicator appears immediately while Play is pending
- Unit test: The spawn indicator is replaced by one ready button beside Play
- Unit test: Timeout and abort remove the spawn indicator
- Unit test: Timeout resolves null and abort propagates without injection
- Unit test: Button is enabled and ready immediately after injection
- Unit test: Loading state prevents repeated clicks
- Unit test: Error state remains enabled and retries on click
- Unit test: Error message is set and cleared with state transitions
- Manual test: Verify button appears next to Play button
- Manual test: Verify button styling matches Netflix
- Manual test: Verify cleanup on navigation
