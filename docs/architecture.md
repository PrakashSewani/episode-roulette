# Architecture

## System Overview

Episode Roulette is a Chrome extension that operates as a content script injected into Netflix's web page. It detects TV series pages, injects a UI button, discovers episodes via DOM traversal, and triggers random playback using Netflix's own interactions.

```
┌─────────────────────────────────────────────────┐
│                  Netflix Web Page                │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         Episode Roulette Content Script   │   │
│  │                                           │   │
│  │  ┌─────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │ Observer │──│ Detector │──│ Button │ │   │
│  │  └────┬────┘  └──────────┘  └────────┘ │   │
│  │       │                                  │   │
│  │       ▼                                  │   │
│  │  ┌────────────┐  ┌───────────────────┐  │   │
│  │  │  Traverser  │──│ Episode Collector │  │   │
│  │  └────────────┘  └───────────────────┘  │   │
│  │       │                                  │   │
│  │       ▼                                  │   │
│  │  ┌───────────┐  ┌───────────┐          │   │
│  │  │ Randomizer │──│ Navigator │          │   │
│  │  └───────────┘  └───────────┘          │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Data Flow

```
1. Content script loads
       │
       ▼
2. observer.ts starts watching for route changes
       │
       ▼
3. detector.ts identifies a TV series page
       │
       ▼
4. button.ts injects "Random Episode" button (loading state)
       │
       ▼
5. season-traverser.ts begins episode discovery
   ├── Clicks season 1 tab → waits for DOM → collects episodes
   ├── Clicks season 2 tab → waits for DOM → collects episodes
   └── Repeats for all seasons
       │
       ▼
6. button.ts updates to ready state
       │
       ▼
7. User clicks "Random Episode"
       │
       ▼
8. randomizer.ts selects one episode uniformly at random
       │
       ▼
9. navigator.ts triggers Netflix-native playback
       │
       ▼
10. Episode plays as if user clicked it manually
```

---

## Module Map

| Module | File | Responsibility | Dependencies |
|--------|------|---------------|--------------|
| SPA Observer | `src/netflix/observer.ts` | Watch for SPA route changes | None |
| Series Detector | `src/netflix/detector.ts` | Determine if current page is a TV series | `selectors.ts` |
| DOM Selectors | `src/netflix/selectors.ts` | Single source of truth for all DOM queries | None |
| DOM Utilities | `src/netflix/dom-utils.ts` | Resilient DOM query helpers | `selectors.ts` |
| Season Traverser | `src/discovery/season-traverser.ts` | Click through seasons, collect episodes | `dom-utils.ts`, `episode-collector.ts` |
| Episode Collector | `src/discovery/episode-collector.ts` | Parse episode elements from DOM | `dom-utils.ts`, `types.ts` |
| Button | `src/ui/button.ts` | Create and inject UI button | `styles.ts`, `feedback.ts` |
| Styles | `src/ui/styles.ts` | Inject CSS matching Netflix design | None |
| Feedback | `src/ui/feedback.ts` | Loading spinner and error states | None |
| Randomizer | `src/engine/randomizer.ts` | Uniform random selection | `types.ts` |
| Navigator | `src/engine/navigator.ts` | Trigger Netflix-native playback | `types.ts` |
| Types | `src/types.ts` | Shared TypeScript interfaces | None |

---

## Separation of Concerns

Each module has a single responsibility. Modules communicate through:

1. **Events** — Observer emits events, other modules listen
2. **Function calls** — Direct imports for tightly coupled flows
3. **Shared types** — `types.ts` defines common interfaces

**No module should directly import selectors from another module's implementation.** All selectors go through `selectors.ts`.

**No module should directly manipulate Netflix DOM without going through `dom-utils.ts`.**

---

## Key Design Decisions

### 1. DOM Traversal Over API Interception

**Decision**: Discover episodes by traversing Netflix's UI, not by intercepting network requests.

**Rationale**: Netflix's internal APIs are undocumented and change frequently. DOM traversal is slower but more maintainable — when Netflix changes their UI, we update selectors in one file.

**Tradeoff**: Slower discovery (must click through seasons), but zero dependency on undocumented APIs.

### 2. Centralized Selectors

**Decision**: All DOM selectors live in `selectors.ts`, not scattered across modules.

**Rationale**: Netflix uses dynamic CSS class names (CSS Modules). When they update, only one file needs changing. Also makes it easy to add fallback selectors.

### 3. MutationObserver for SPA Detection

**Decision**: Use MutationObserver as primary SPA detection mechanism, with URL polling as backup.

**Rationale**: MutationObserver is event-driven (no polling waste) and catches DOM re-renders that indicate navigation. URL polling catches edge cases where DOM doesn't change.

### 4. In-Memory Caching

**Decision**: Cache discovered episodes in memory, keyed by series ID.

**Rationale**: Avoids re-discovering episodes when the user clicks the button multiple times on the same series. Cache is lost on page refresh (acceptable — discovery is fast enough).

### 5. Click Simulation Over URL Navigation

**Decision**: Trigger playback by clicking the episode's DOM element, not by navigating to its URL.

**Rationale**: Clicking the element triggers Netflix's full playback flow (loading, buffering, resuming from where the user left off). URL navigation might bypass some of this.

---

## File Structure

```
src/
├── content.ts               # Content script entry point
├── background.ts            # Service worker
├── types.ts                 # Shared TypeScript interfaces
├── netflix/
│   ├── observer.ts          # SPA navigation detection
│   ├── detector.ts          # Series page detection
│   ├── selectors.ts         # DOM selector configuration
│   └── dom-utils.ts         # Resilient DOM query helpers
├── discovery/
│   ├── season-traverser.ts  # Season traversal and episode discovery
│   └── episode-collector.ts # Episode element parsing
├── ui/
│   ├── button.ts            # Button injection
│   ├── styles.ts            # CSS injection
│   └── feedback.ts          # Loading/error states
└── engine/
    ├── randomizer.ts        # Random selection
    └── navigator.ts         # Playback navigation
```
