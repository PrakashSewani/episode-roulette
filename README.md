# Episode Roulette 🎲

A Chrome / Brave WebExtension that adds a **Random Episode** button to supported TV series on logged-in desktop **Netflix** and **Prime Video** (India) normal profiles. A macOS Safari wrapper exists but Safari publishing is deferred until demand justifies its cost.

Stop spending 10 minutes choosing what to rewatch. Click a button, get a random episode, start watching.

---

## What It Does

- Detects when you open a TV series on Netflix or Prime Video
- Injects a **🎲 Random Episode** button next to the Play button
- Discovers all available episodes across every season
- Picks one at random with equal probability
- Starts playback exactly as if you clicked it manually

## Design Principles

- **Native feel** — matches each provider's own UI, feels like an official feature
- **Zero config** — install and it just works
- **No external services** — no APIs, no databases, no accounts
- **Modular** — easy to maintain and adapt when Netflix or Prime changes their UI

First-release support targets Netflix's observed desktop title-detail layouts (implicit single-season lists and the custom English season dropdown) and Prime Video India's English desktop detail pages. Kids profiles and non-English UI require separate validation before support is claimed.

### Season support

**Netflix (live-validated on desktop Chrome, including JoJo `80179831`):** multi-season series with Netflix's custom dropdown, including numeric labels such as `Season 1` / `Season 2` and named labels (arcs, subtitles, combined labels such as `Phantom Blood/Battle Tendency`, `Part` / `Volume` / `Specials`, etc.), with optional English episode counts on a separate line or as a same-line trailing suffix. Implicit single-season lists without a dropdown are also supported. Large named seasons that load in batches without `section-expand` are completed by scoped list scrolling (episode list only, not the whole page). Season controls are waited for after returning from `/watch/` so cached re-rolls do not false-fail.

**Prime Video India (live-validated on desktop Brave/Chromium, English UI):** multi-season series with season detail links, including complete eligible-catalog discovery across all seasons. Only rows with a native play control are eligible; `COMING SOON`, unavailable, rental, purchase, and unapproved-channel items are excluded. Partially watched episodes resume from the beginning after a roll (seek-to-start), and the in-page player confirms playback.

Documented Netflix actions such as `See All Episodes` are ignored rather than treated as seasons. Duplicate or empty season identities fail safely. Incomplete discovery never randomizes a partial catalog.

### Known limitations

- **English Netflix UI only** for episode-count parsing and the action denylist; other locales need separate validation.
- **Prime Video is supported on desktop Chrome / Brave (India, English UI) only.** Safari Prime is not yet validated.
- **macOS Safari is not currently published.** The Safari wrapper exists, but publishing is deferred until enough requests or donations justify its cost.
- **Kids / restricted profiles** are not claimed.
- **First full discovery** on large multi-season titles can take several seconds and briefly scrolls the episode list while loading remaining rows; later rolls reuse the in-memory catalog until the tab is refreshed.
- **No selection history / no repeat prevention** — each roll is independent uniform random.
- **Prime discovery visits every season** on first roll, so the first Prime roll can take ~40–60 s on multi-season titles; later rolls reuse the in-memory catalog.

## Tech Stack

- Manifest V3
- Safari Web Extensions (wrapper only; publishing deferred)
- TypeScript
- Vite
- Content Scripts
- MutationObserver
- Xcode for macOS Safari packaging (optional, deferred)

## Project Structure

```
src/
├── manifest.ts              # Canonical cross-browser manifest
├── content.ts               # Content script entry point
├── types.ts                 # TypeScript types
├── providers/
│   ├── index.ts             # Exact-host provider registry
│   ├── netflix.ts           # Netflix provider adapter
│   └── prime-video.ts       # Prime Video provider adapter
├── netflix/
│   ├── observer.ts          # SPA navigation detection
│   ├── detector.ts          # Title identity and scoped series detection
│   ├── selectors.ts         # DOM selector config
│   ├── dom-utils.ts         # Resilient DOM queries
│   ├── season-controller.ts # Shared season interaction
│   └── episode-identity.ts  # Episode identity parsing
├── prime/
│   ├── routes.ts            # Prime route/root detection
│   ├── observer.ts          # Prime observation
│   ├── selectors.ts         # Prime DOM selector config
│   ├── discovery.ts         # Prime eligible-catalog discovery
│   ├── identity.ts          # Prime episode identity
│   └── pending.ts           # Pending-playback marker
├── discovery/
│   ├── season-traverser.ts  # Season traversal
│   └── episode-collector.ts # Episode parsing
├── ui/
│   ├── button.ts            # Button injection
│   ├── styles.ts            # CSS injection
│   └── feedback.ts          # Loading/error states
├── popup/
│   ├── index.html           # Toolbar popup entry
│   └── popup.ts             # Popup status and roll trigger
└── engine/
    ├── randomizer.ts        # Random selection
    ├── navigator.ts         # Playback navigation
    └── restart.ts           # Netflix seek-to-beginning after /watch/
safari/                      # macOS Safari Xcode wrapper (publishing deferred)
```

Chrome and Safari share the same content-script implementation. The Safari project only wraps generated WebExtension resources and does not duplicate product logic. Neither browser registers a background service worker. Safari publishing is deferred until demand justifies its cost.

## Development

```bash
npm install
npm run build
```

Load `dist/webextension/` as an unpacked extension in `chrome://extensions` (or Brave's `brave://extensions`).

Safari packaging (`npm run safari:sync` / `npm run safari:build`) remains available for maintainers but is not part of the current release path.

## Build

```bash
npm run build
npm run safari:sync   # optional; Safari publishing deferred
npm run safari:build  # optional; Safari publishing deferred
```

Maintainers use `npm run safari:init` only for the initial wrapper bootstrap or an explicitly approved regeneration. It fails rather than overwriting an existing canonical wrapper.

## Documentation

Full design docs live in `docs/`. Start with `docs/implementation-plan.md`.

Agent instructions are in `AGENTS.md`.

## License

MIT
