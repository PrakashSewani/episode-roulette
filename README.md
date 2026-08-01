# Episode Roulette 🎲

A Chrome and macOS Safari WebExtension that adds a **Random Episode** button to supported TV series on logged-in desktop Netflix normal profiles.

Stop spending 10 minutes choosing what to rewatch. Click a button, get a random episode, start watching.

---

## What It Does

- Detects when you open a TV series on Netflix
- Injects a **🎲 Random Episode** button next to the Play button
- Discovers all available episodes across every season
- Picks one at random with equal probability
- Starts playback exactly as if you clicked it manually

## Design Principles

- **Native feel** — matches Netflix's own UI, feels like an official feature
- **Zero config** — install and it just works
- **No external services** — no APIs, no databases, no accounts
- **Modular** — easy to maintain and adapt when Netflix changes their UI

First-release support targets Netflix's observed desktop title-detail layouts: implicit single-season lists and the custom English season dropdown. Kids profiles and non-English Netflix UI require separate validation before support is claimed.

### Season support

**Supported (live-validated on desktop Chrome, including JoJo `80179831`):** multi-season series with Netflix's custom dropdown, including numeric labels such as `Season 1` / `Season 2` and named labels (arcs, subtitles, combined labels such as `Phantom Blood/Battle Tendency`, `Part` / `Volume` / `Specials`, etc.), with optional English episode counts on a separate line or as a same-line trailing suffix. Implicit single-season lists without a dropdown are also supported. Large named seasons that load in batches without `section-expand` are completed by scoped list scrolling (episode list only, not the whole page). Season controls are waited for after returning from `/watch/` so cached re-rolls do not false-fail.

Documented Netflix actions such as `See All Episodes` are ignored rather than treated as seasons. Duplicate or empty season identities fail safely. Incomplete discovery never randomizes a partial catalog.

### Known limitations

- **English Netflix UI only** for episode-count parsing and the action denylist; other locales need separate validation.
- **Kids / restricted profiles** are not claimed.
- **First full discovery** on large multi-season titles can take several seconds and briefly scrolls the episode list while loading remaining rows; later rolls reuse the in-memory catalog until the tab is refreshed.
- **No selection history / no repeat prevention** — each roll is independent uniform random.
- **Verbose console logs** (`[Episode Roulette] …`) are present for pre-publish debugging; remove or silence before store release (see `docs/project-todos.md`).

## Tech Stack

- Manifest V3
- Safari Web Extensions
- TypeScript
- Vite
- Content Scripts
- MutationObserver
- Xcode for macOS Safari packaging

## Project Structure

```
src/
├── manifest.ts              # Canonical cross-browser manifest
├── content.ts               # Content script entry point
├── types.ts                 # TypeScript types
├── netflix/
│   ├── observer.ts          # SPA navigation detection
│   ├── detector.ts          # Title identity and scoped series detection
│   ├── selectors.ts         # DOM selector config
│   ├── dom-utils.ts         # Resilient DOM queries
│   ├── season-controller.ts # Shared season interaction
│   └── episode-identity.ts  # Episode identity parsing
├── discovery/
│   ├── season-traverser.ts  # Season traversal
│   └── episode-collector.ts # Episode parsing
├── ui/
│   ├── button.ts            # Button injection
│   ├── styles.ts            # CSS injection
│   └── feedback.ts          # Loading/error states
├── engine/
│   ├── randomizer.ts        # Random selection
│   └── navigator.ts         # Playback navigation
safari/                      # macOS Safari Xcode wrapper
```

Chrome and Safari share the same content-script implementation. The Safari project only wraps generated WebExtension resources and does not duplicate product logic. Neither browser registers a background service worker.

## Development

```bash
npm install
npm run build
```

Load `dist/webextension/` as an unpacked extension in `chrome://extensions`.

For normal macOS Safari packaging, sync the universal build resources and open `safari/EpisodeRoulette.xcodeproj` in Xcode.

## Build

```bash
npm run build
npm run safari:sync
npm run safari:build
```

Maintainers use `npm run safari:init` only for the initial wrapper bootstrap or an explicitly approved regeneration. It fails rather than overwriting an existing canonical wrapper.

## Documentation

Full design docs live in `docs/`. Start with `docs/implementation-plan.md`.

Agent instructions are in `AGENTS.md`.

## License

MIT
