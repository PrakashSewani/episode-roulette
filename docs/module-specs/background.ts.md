# background.ts — Onboarding Hooks Service Worker

## Purpose

Open the install onboarding page once when the extension is installed, and register the uninstall survey URL — without carrying any product logic.

---

## Responsibilities

1. Register `https://episode-roulette.prakashsewani.com/uninstalled` as the uninstall URL
2. Open `https://episode-roulette.prakashsewani.com/thanks` in a new tab exactly once, when `chrome.runtime.onInstalled` reports `reason === 'install'`
3. Fail quietly when either hook is unavailable, so onboarding never affects product behavior

This is the only background runtime in the product. It does not observe pages, discover episodes, hold catalog state, message the content script, read storage, or perform network requests.

---

## API

There is no exported API. The module is a Manifest V3 service worker entry point that registers its listeners at startup.

```typescript
// src/background.ts
chrome.runtime.onInstalled.addListener(...)
```

---

## Approved URLs

| Hook | Trigger | URL |
|------|---------|-----|
| Install | `onInstalled` with `reason: 'install'` | `https://episode-roulette.prakashsewani.com/thanks` |
| Uninstall | `chrome.runtime.setUninstallURL` | `https://episode-roulette.prakashsewani.com/uninstalled` |

Both destinations are served by the `episode-roulette-website` Cloudflare Worker. That site must be deployed with both routes live before a release that depends on them is published.

---

## Registration Points

- `setUninstallURL` is called once at service-worker startup and again inside `onInstalled`, so the uninstall destination is set no matter which event wakes the worker.
- The install tab opens only for `reason === 'install'`. Updates, browser updates, and manual reloads open nothing.

---

## Permission Contract

No extension permissions are used.

| API | Permission required |
|-----|--------------------|
| `chrome.runtime.setUninstallURL` | none |
| `chrome.tabs.create` | none — the `tabs` permission only gates sensitive tab properties such as `url` and `title` |

`scripts/assert-packaging.mjs` enforces both the zero-permission manifest and this exact background declaration.

---

## Failure Handling

- `chrome.runtime.setUninstallURL` is feature-detected. Safari does not implement it, so the call is skipped rather than throwing.
- Both hooks are guarded so a throwing call or a rejected `chrome.tabs.create` logs a warning through `src/debug.ts` and is otherwise ignored.
- Onboarding failures are never fatal and never block content-script behavior (see `docs/error-handling.md`).

---

## Manifest

`src/manifest.ts` declares:

```typescript
background: {
  service_worker: 'src/background.ts',
  type: 'module',
},
```

CRXJS bundles the TypeScript entry and rewrites the path in the emitted manifest. The service worker is included in the universal build and in the mirrored Safari resources.

---

## Testing

- Unit test: importing the module registers `setUninstallURL` with the uninstall URL
- Unit test: `onInstalled` with `reason: 'install'` opens the thanks URL in exactly one new tab
- Unit test: `onInstalled` with `reason: 'update'` opens no tab while still registering the uninstall URL
- Unit test: a missing `setUninstallURL` (Safari) does not throw
- Unit test: a rejected `tabs.create` produces no unhandled rejection and logs a warning

Live uninstall verification is not automated: the registered URL only fires after a real uninstall of the published extension.
