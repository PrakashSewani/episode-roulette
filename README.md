# Episode Roulette 🎲

A Chrome extension that adds a **Random Episode** button to TV series on Netflix.

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

## Tech Stack

- Manifest V3
- TypeScript
- Vite
- Content Scripts
- MutationObserver

## Project Structure

```
src/
├── content.ts               # Content script entry point
├── background.ts            # Service worker
├── netflix/
│   ├── observer.ts          # SPA navigation detection
│   ├── detector.ts          # Series page detection
│   ├── selectors.ts         # DOM selector config
│   └── dom-utils.ts         # Resilient DOM queries
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
└── types.ts                 # TypeScript types
```

## Development

```bash
npm install
npm run dev
```

Load the `dist/` folder as an unpacked extension in `chrome://extensions`.

## Build

```bash
npm run build
```

## Documentation

Full design docs live in `docs/`. Start with `docs/implementation-plan.md`.

Agent instructions are in `AGENTS.md`.

## License

MIT
