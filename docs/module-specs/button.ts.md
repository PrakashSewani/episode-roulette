# button.ts — UI Button Injection

## Purpose

Create and inject a "Random Episode" button that matches Netflix's design language.

---

## Responsibilities

1. Create button element with correct HTML structure
2. Insert button next to Netflix's Play button
3. Handle button state changes (loading, ready, error)
4. Clean up on navigation away from series page

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

1. Find Netflix's Play button using `PLAY_BUTTON` selector
2. Get its parent container
3. Insert our button as a sibling (after Play button)
4. Ensure button is visible and accessible

```typescript
import { resilientQuery } from '../netflix/dom-utils'
import { PLAY_BUTTON } from '../netflix/selectors'

const playButton = resilientQuery(PLAY_BUTTON.selectors) as HTMLElement
if (playButton) {
  const container = playButton.parentElement
  container?.insertBefore(createButton(), playButton.nextSibling)
}
```

---

## API

```typescript
import { ButtonState } from '../types'

/**
 * Inject the Random Episode button into the page.
 * Returns a controller for managing the button.
 */
export function injectButton(): ButtonController

interface ButtonController {
  /** Update button state */
  setState(state: ButtonState): void

  /** Set click handler */
  onClick(handler: () => void): void

  /** Remove button from DOM */
  remove(): void
}
```

---

## Button States

### Loading

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

### Ready

```css
.ep-roulette-btn {
  opacity: 1;
  cursor: pointer;
}
.ep-roulette-btn:hover {
  filter: brightness(1.2);
}
```

### Error

```css
.ep-roulette-btn {
  opacity: 0.7;
}
.ep-roulette-btn::after {
  content: '⚠';
  margin-left: 4px;
}
```

---

## Cleanup

Button is removed when:
- User navigates away from series page
- `series-left` event is emitted
- `button.remove()` is called

```typescript
// Cleanup handler
observer.onEvent((event) => {
  if (event.type === 'series-left') {
    controller.remove()
  }
})
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
| Button already exists | Don't inject duplicate, return existing |
| Netflix layout changes | Button may need repositioning (documented in selectors) |
| Multiple series pages quickly | Remove old button, inject new one |

---

## Testing

- Unit test: Button creation and DOM insertion
- Manual test: Verify button appears next to Play button
- Manual test: Verify button styling matches Netflix
- Manual test: Verify cleanup on navigation
