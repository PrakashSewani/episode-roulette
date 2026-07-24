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

### Season-Name Support

For multi-season series, Episode Roulette supports numeric entries such as `Season 1` and named entries such as arcs, subtitles, `Part <number>`, `Volume <number>`, and `Specials`, including entries that do not display a season number or episode count.

Documented Netflix actions such as `See All Episodes` are ignored rather than treated as seasons. Duplicate or empty season identities fail safely. English Netflix text remains the validated first-release UI scope.

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

Use `CHROME-VALIDATION.md` for the root-level Chrome installation and live Netflix checklist.

Agent instructions are in `AGENTS.md`.

## License

MIT
