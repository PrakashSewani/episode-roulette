# popup.ts — Extension Toolbar Popup

## Purpose

Provide a toolbar button popup that shows the current series status and offers a second entry point to roll a random episode, alongside the in-page button.

---

## Responsibilities

1. Query the active Netflix tab for the current series status from the content script
2. Render one of four status states: `no-series`, `ready`, `loading`, or `error`
3. Send a `roll` message to the content script to trigger the same playback flow as the in-page button
4. Refresh status after a roll is accepted and after the popup reopens

This module does not own discovery, selection, playback, cache, or any content-script lifecycle. It is a stateless view that sends messages to `content.ts` and renders the response.

---

## API

```typescript
import type { PopupMessage, PopupMessageResponse, PopupStatus } from '../types'
```

The popup has no exported runtime API. It is an HTML entry point loaded by the browser when the user clicks the toolbar action button.

---

## Status States

| Status | Meaning | UI |
|--------|---------|-----|
| `no-series` | No series confirmed, no active context, or not on Netflix | Roll button disabled; status text: "Open a Netflix TV series to roll a random episode." |
| `ready` | Series confirmed, button in ready state | Roll button enabled; status text: "Series detected. Click to roll a random episode." |
| `loading` | Discovery or playback in progress | Roll button disabled; dice icon spins; status text: "Rolling... discovering all seasons." |
| `error` | Last operation failed with a retryable error | Roll button enabled; status text: "Last attempt failed. Click to try again." |

---

## Messaging

The popup communicates with the content script through the standard `chrome.tabs.sendMessage` API. No service worker is required.

### `getStatus`

```typescript
// popup sends:
{ type: 'getStatus' }

// content script responds:
{ type: 'status', status: PopupStatus }
```

The popup sends this on open and after a roll completes. If the content script does not respond (not on Netflix or content script not loaded), the popup shows `no-series`.

### `roll`

```typescript
// popup sends:
{ type: 'roll' }

// content script responds:
{ type: 'roll-accepted' }   // playback started
| { type: 'roll-rejected', reason: string }  // not ready or no series
```

When `roll-accepted` is received, the popup closes immediately via `window.close()` so the user can watch the episode selection and playback on Netflix. When `roll-rejected`, the popup shows `no-series`.

The content script applies all existing generation, abort, and context guards before accepting the roll. A rejected roll never starts discovery or playback.

---

## Popup HTML

```html
<div class="ep-roulette-popup">
  <header>
    <img src="../../icons/icon-48.png" alt="" class="ep-roulette-logo" />
    <h1>Episode Roulette</h1>
  </header>
  <p class="ep-roulette-status" id="status">Checking Netflix...</p>
  <button class="ep-roulette-roll" id="roll" disabled>
    <span class="ep-roulette-roll-icon">🎲</span>
    <span class="ep-roulette-roll-text">Roll Random Episode</span>
  </button>
</div>
```

The popup CSS uses Netflix-inspired dark styling with the red dice accent. The panel width is 280px. The dice icon spins during `loading` via CSS animation.

---

## Relationship to the In-Page Button

The popup is a **second entry point**, not a replacement for the in-page button injected by `button.ts`. Both trigger the same `runPlayback()` flow in `content.ts`. The in-page button remains for discoverability next to Netflix's Play button; the popup provides toolbar access without scrolling to the button.

The popup never injects DOM into the Netflix page, observes the page, or performs discovery directly.

---

## Manifest

`src/manifest.ts` declares:

```typescript
action: {
  default_popup: 'src/popup/index.html',
  default_title: 'Episode Roulette',
  default_icon: { ... },
},
icons: { ... },
```

No additional permissions are required. The existing `host_permissions` for Netflix allows `chrome.tabs.sendMessage` to the content script.

---

## Testing

- Unit test: popup renders `no-series` when content script does not respond
- Unit test: popup renders `ready` when content script responds with `status: 'ready'`
- Unit test: popup sends `roll` message and closes popup on `roll-accepted`
- Unit test: popup sends `roll` message and stays `no-series` on `roll-rejected`
- Unit test: roll button is disabled during `loading` and `no-series`
- Integration test: content script responds to `getStatus` with correct status for each lifecycle state
- Integration test: content script `roll` message triggers the same playback flow as the in-page button click
