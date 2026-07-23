# Architecture

## System Overview

Episode Roulette is a WebExtension for Chrome and macOS Safari that operates as a shared content script injected into Netflix's web page. It identifies the active Netflix title-details context, confirms series from the rendered episodic DOM, injects a UI button, discovers episodes via DOM traversal, and triggers random playback using Netflix's own interactions.

```
┌─────────────────────────────────────────────────┐
│                  Netflix Web Page                │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         Episode Roulette Content Script   │   │
│  │                                           │   │
│  │  ┌─────────┐  ┌──────────────┐         │   │
│  │  │ Observer │──│ Orchestrator │         │   │
│  │  └─────────┘  └──────┬───────┘         │   │
│  │                       │                  │   │
│  │               ┌───────┴───────┐         │   │
│  │               │               │         │   │
│  │          ┌──────────┐     ┌────────┐    │   │
│  │          │ Detector │     │ Button │    │   │
│  │          └──────────┘     └────────┘    │   │
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
2. observer.ts reports neutral Netflix route and DOM changes
       │
       ▼
3. content.ts extracts the active title identity (`jbv` first, `/title/<id>` second)
       │
       ▼
4. content.ts locates the active title-details container and scopes observation to it
       │
       ▼
5. detector.ts confirms a series only from episodic UI inside that container
       │
       ▼
6. button.ts injects enabled "Random Episode" button (ready state)
       │
       ▼
7. User clicks "Random Episode"
       │
       ▼
8. button.ts changes to loading state
       │
       ▼
9. content.ts checks its complete-catalog cache
    ├── Cache hit → uses complete durable metadata
    └── Cache miss → season-traverser.ts performs uncached discovery
        ├── No control → collects one implicit season
        ├── Custom dropdown → activates and validates each season
        └── Expands, collects, and repeats for all seasons
       │
       ▼
10. randomizer.ts selects one episode uniformly at random
       │
       ▼
11. navigator.ts triggers Netflix-native playback
       │
       ▼
12. Episode plays as if user clicked it manually
```

---

## Module Map

| Module | File | Responsibility | Dependencies |
|--------|------|---------------|--------------|
| Orchestrator | `src/content.ts` | Own active title context, scoped observation, detection lifecycle, and cleanup | All feature modules |
| SPA Observer | `src/netflix/observer.ts` | Report neutral URL and DOM changes without classifying content | None |
| Series Detector | `src/netflix/detector.ts` | Extract title identity and classify episodic DOM inside a supplied root | `selectors.ts`, `dom-utils.ts`, `season-controller.ts` |
| DOM Selectors | `src/netflix/selectors.ts` | Single source of truth for all DOM queries | None |
| DOM Utilities | `src/netflix/dom-utils.ts` | Generic resilient DOM query and abortable wait helpers | None |
| Season Controller | `src/netflix/season-controller.ts` | Shared dropdown enumeration, activation, transition, expansion, and validation | `selectors.ts`, `dom-utils.ts`, `types.ts` |
| Episode Identity | `src/netflix/episode-identity.ts` | Shared pure episode parsing, normalization, and live-row matching | `selectors.ts`, `dom-utils.ts`, `types.ts` |
| Season Traverser | `src/discovery/season-traverser.ts` | Sequence seasons, retry failures, and aggregate complete catalogs | `season-controller.ts`, `episode-collector.ts`, `types.ts` |
| Episode Collector | `src/discovery/episode-collector.ts` | Build durable episode metadata from supplied complete rows | `episode-identity.ts`, `types.ts` |
| Button | `src/ui/button.ts` | Create and inject UI button | `selectors.ts`, `dom-utils.ts`, `styles.ts`, `types.ts` |
| Styles | `src/ui/styles.ts` | Inject CSS matching Netflix design | None |
| Feedback | `src/ui/feedback.ts` | Own error toast DOM, timers, replacement, and removal | None |
| Randomizer | `src/engine/randomizer.ts` | Uniform random selection | `types.ts` |
| Navigator | `src/engine/navigator.ts` | Re-resolve durable metadata and trigger Netflix-native playback | `season-controller.ts`, `episode-identity.ts`, `selectors.ts`, `dom-utils.ts`, `types.ts` |
| Types | `src/types.ts` | Shared TypeScript interfaces | None |

---

## Separation of Concerns

Each module has a single responsibility. Modules communicate through:

1. **Events** — Observer reports neutral Netflix page changes to the orchestrator
2. **Function calls** — Direct imports for tightly coupled flows
3. **Shared types** — `types.ts` defines common interfaces

**`selectors.ts` is the only implementation source for Netflix selector strings.** Feature modules import named selector configurations from it. They must not define selector literals locally or import selector details from another feature module.

**`dom-utils.ts` is Netflix-agnostic.** It receives selector arrays and roots from callers and contains no Netflix selector imports, season semantics, episode parsing, or UI behavior.

**Netflix-owned elements must be located through `selectors.ts` and `dom-utils.ts`.** Feature modules may interact with an element after it has been resolved through those boundaries. Netflix-specific season actions belong in `season-controller.ts`; episode parsing and matching belong in `episode-identity.ts`, not in generic DOM utilities.

---

## Key Design Decisions

### 1. DOM Traversal Over API Interception

**Decision**: Discover episodes by traversing Netflix's UI, not by intercepting network requests.

**Rationale**: Netflix's internal APIs are undocumented and change frequently. DOM traversal is slower but more maintainable — when Netflix changes their UI, we update selectors in one file.

**Tradeoff**: Slower discovery (must click through seasons), but zero dependency on undocumented APIs.

### 2. Centralized Selectors

**Decision**: All DOM selectors live in `selectors.ts`, not scattered across modules.

**Rationale**: Netflix uses dynamic CSS class names (CSS Modules). When they update, only one file needs changing. Also makes it easy to add fallback selectors.

**Documentation authority**: `docs/module-specs/selectors.ts.md` is normative and defines what `src/netflix/selectors.ts` must export. `docs/selectors-reference.md` is a dated observation log and maintenance aid. If they disagree, implementation follows the module spec until live evidence is reviewed and the module spec is updated.

### 3. Route Identity, DOM Classification

**Decision**: A Netflix `/title/<id>` path or valid `jbv=<id>` query parameter identifies only the active title context. It never classifies that title as a movie or series. Netflix uses `jbv` for detail overlays for both content types. Only an episode list containing valid episode rows inside the active title-details container confirms a series.

**Rationale**: Netflix movie and series title pages can share the same URL shape. Requiring episodic UI prevents the extension from activating on movie pages while still supporting single-season series that do not render a season selector.

**Single-season rule**: If episode rows are present but no season control is present after the detection window, discovery treats the currently rendered episode list as one implicit season. A missing season control is not an error by itself.

**Detection deadline**: Each active title context receives one absolute five-second deadline covering root discovery, root replacements during initial rendering, and episodic confirmation. Ordinary DOM mutations and same-title root replacements do not extend or restart it. Only a new title identity starts a new deadline.

### 4. Scoped DOM Observation

**Decision**: Use history events and URL polling to detect title-identity changes. While waiting for Netflix to render the active title-details container, use a temporary debounced observer on `document.body`. Once found, disconnect that observer and attach a scoped `MutationObserver` to the title-details container.

**Rationale**: Route signals reliably identify which title is active but cannot classify it. Scoped DOM observation catches asynchronous Netflix rendering without repeatedly scanning unrelated carousels, previews, navigation, or playback controls.

**Lifecycle rule**: When the title ID changes or the details container is removed, disconnect the scoped observer, remove extension UI, abort the prior operation context, and increment the generation. A same-title replacement continues root discovery only until the original absolute deadline; it does not receive a fresh deadline.

**Root rule**: The active details root is the single connected, visible candidate that satisfies documented Netflix title-detail structure. Zero candidates means keep waiting; multiple candidates are ambiguous and remain unresolved. The extension never selects an arbitrary first dialog.

### 5. User-Triggered Discovery

**Decision**: Confirming a series injects an enabled `Random Episode` button, but does not traverse seasons. The first click changes the button to loading, discovers episodes, selects one, and starts playback. Later clicks may use a valid cache.

**Rationale**: Season traversal changes Netflix's visible UI and can be expensive for large series. It should occur only after explicit user intent rather than as background work whenever a series overlay opens.

### 6. In-Memory Caching

**Decision**: `content.ts` exclusively owns complete episode catalogs in content-script memory, keyed by Netflix series ID, until the Netflix tab reloads or closes. Closing an overlay or opening another title does not clear a valid catalog. `season-traverser.ts` always performs uncached discovery and returns a complete catalog without retaining it.

**Rationale**: Avoids re-traversing every season on repeated clicks without tracking what the user watched or changing selection probability.

**Randomness boundary**:

- The cache stores the available catalog, not selection history.
- Selected or played episodes are never recorded.
- Every click independently samples the complete catalog with uniform probability.
- Repeats are allowed and receive the same probability as every other episode.
- No catalog, selection, or playback data is persisted to `localStorage`, extension storage, or a backend.
- Cache writes and invalidation occur only in `content.ts`, where title and generation guards are available.

**Invalidation**: If live playback resolution detects that the selected season's complete row count or identity no longer matches cached metadata, invalidate only that series entry and run one fresh complete discovery. If the refreshed discovery or playback still fails, show the normal retryable error. Do not repeatedly rediscover in a loop.

### 7. Durable Metadata and Live Row Resolution

**Decision**: Discovery stores durable episode metadata only. After random selection, playback reactivates the episode's season, expands the complete list, uniquely re-resolves the current live row, and clicks it.

**Rationale**: Live inspection confirmed that Netflix episode rows are clickable but contain no anchor URL. Rows from earlier seasons become stale during traversal. Re-resolving combines durable selection with Netflix's native playback behavior.

**Safety rules**:

- Cached episodes contain no `HTMLElement` references.
- The current title-details URL is never treated as an episode URL.
- Number and normalized title are preferred matching signals.
- Complete-season position is used only when the live row count matches discovery and no stronger identity exists.
- Missing or ambiguous matches fail without clicking.

### 8. Complete Discovery Required

**Decision**: Random selection proceeds only after every enumerated Netflix season has been discovered successfully. If a season fails to load or parse, discovery re-queries the current Netflix controls and retries that season once. If the retry fails, the entire discovery operation fails.

**Rationale**: Selecting from a partial episode set would exclude episodes in failed seasons and violate the product promise of uniform random selection across the series.

**Rules**:

- Partial episode results are discarded.
- Partial results are never cached.
- No episode is randomized or played after an incomplete discovery.
- The button enters an error state and remains available for a new user-initiated retry.
- The retry is scoped to the failed season; previously successful seasons do not need to be traversed again during the same operation.

### 9. Netflix Season-Control Strategies

**Decision**: Core discovery supports only Netflix layouts verified against the live desktop web UI:

1. An episode selector without a season control, treated as one implicit season
2. Netflix's custom season dropdown using a toggle, menu, and menu items

Native `<select>`, tab bars, and accordions are not core-release requirements unless they are observed on Netflix and documented with stable selectors and transition behavior.

**Extensibility**: `season-controller.ts` owns the season-control strategy boundary. Adding a newly observed Netflix layout requires a new strategy implementation and selectors, without changing episode collection, traversal sequencing, playback orchestration, or randomization.

**Observed Netflix custom dropdown**:

- Episode section: `[data-uia="episode-selector"]`
- Toggle: `[data-uia="dropdown-toggle"][aria-haspopup="true"]`
- Menu: `[data-uia="dropdown-menu"][role="menu"]`
- Season item: `[data-uia="dropdown-menu-item"][role="menuitem"]`
- Current season identity: normalized toggle text, such as `Season 7`
- Menu item metadata may include an expected count, such as `(24 Episodes)`

These selectors were verified on Netflix desktop in July 2026 and remain centralized fallbacks rather than permanent assumptions.

**Language scope**: First-release season-label and expected-count parsing supports English Netflix UI only. Unsupported labels or locales fail safely and require separate live observation before support is claimed.

### 10. Expand Truncated Episode Sections

**Decision**: A Netflix season is not complete while `[data-uia="section-expand"]` exists in its episode selector. Discovery clicks the expand control and waits until it disappears and the episode-row count stabilizes.

**Rationale**: Netflix currently renders only the first 10 rows for a season in the detail modal. For an observed 17-episode season, clicking `section-expand` rendered all 17 rows and removed the control. Collecting before expansion would create a biased, incomplete pool.

### 11. Abortable, Generation-Guarded Lifecycle

**Decision**: `content.ts` owns one active operation context containing an `AbortController` and monotonically increasing generation number. Every title identity change, details-root replacement, overlay close, `/watch/` transition, and content-script stop aborts the previous context and increments the generation before starting any new work.

**Rationale**: Abort signals promptly stop cooperative timers, observers, traversal, and playback resolution. Generation checks prevent late promise callbacks or already-queued observer notifications from mutating a newer Netflix title even after cancellation raced with completion.

**Rules**:

- Direct title A to title B navigation invalidates A before detecting B.
- All async discovery and playback APIs require an `AbortSignal`.
- DOM wait utilities resolve cancellation through a typed abort error and always disconnect observers and timers.
- Aborted operations do not show errors and do not change the new title's UI.
- Before cache writes, UI changes, randomization, and the final episode click, the orchestrator verifies both the expected generation and active title ID.
- The final click is synchronous after the last generation and abort check; no asynchronous boundary may exist between that check and `.click()`.

### 12. Fixture-Based Integration Testing

**Decision**: The automated release gate includes Vitest unit tests and jsdom integration tests built from reusable Netflix desktop DOM fixtures. Live Netflix testing remains a manual smoke layer; authenticated browser E2E is not required for the first release.

**Rationale**: The highest-risk behavior is asynchronous coordination across route changes, DOM replacement, season switching, expansion, retries, caching, and playback matching. Unit tests alone cannot verify those contracts, while live Netflix E2E would require credentials and be too brittle for reliable CI.

**Scope**: First-release support is limited to logged-in desktop Netflix normal profiles in current Chrome and macOS Safari. Kids profiles require separate observation and architecture updates before support is claimed.

### 13. Shared Chrome and Safari WebExtension Runtime

**Decision**: Chrome and macOS Safari use one TypeScript content-script implementation, one Netflix module graph, one selector contract, and one WebExtension manifest source. No browser-specific Netflix behavior is forked.

**Chrome packaging**: Vite/CRXJS emits one universal Manifest V3 WebExtension directory that Chrome loads directly.

**Safari packaging**: The same universal WebExtension directory is wrapped as a Safari Web Extension using an Xcode macOS app/extension project initially created with Apple's `safari-web-extension-converter`. Xcode owns Safari signing, bundle identifiers, entitlements, and distribution metadata; it does not contain a second copy of product logic.

**Manifest and version authority**:

- `src/manifest.ts` is the single manifest source.
- `package.json` is the sole canonical product version source.
- The build injects the `package.json` version into the emitted manifest.
- Safari synchronization derives both native targets' `MARKETING_VERSION` from the same package version. `CURRENT_PROJECT_VERSION` is a separate integer build number supplied by CI or the release environment, defaulting to `1` for local unsigned builds.
- Chrome and Safari consume the exact same emitted `manifest.json`, scripts, styles, and product version.

**Runtime boundary**:

- Core code uses standard DOM APIs, `MutationObserver`, timers, `AbortController`, and content-script APIs supported by both target browsers.
- Browser-specific packaging files live outside `src/`.
- No background/service-worker runtime is required in either browser.
- Browser-specific runtime branches require a documented incompatibility and approval; none are currently planned.
- Safari for iOS/iPadOS is outside first-release scope because mobile Netflix layouts and packaging have not been observed or tested.

**Build outputs**:

```text
dist/webextension/          # Universal build loaded by Chrome and synced to Safari
safari/                     # Committed Xcode wrapper; no duplicated src logic
safari/Extension/Resources/ # Generated mirror of dist/webextension/
```

The Xcode wrapper is generated once, normalized to the documented project/resource paths, and committed. Normal builds do not rerun the converter. `safari:sync` runs the universal build, stages and verifies resources before replacing `safari/Extension/Resources/`, and writes generated Safari version settings while preserving committed Xcode project, signing, icon, and app metadata.

---

## File Structure

```
src/
├── manifest.ts              # Canonical cross-browser WebExtension manifest
├── content.ts               # Content script entry point
├── types.ts                 # Shared TypeScript interfaces
├── netflix/
│   ├── observer.ts          # SPA navigation detection
│   ├── detector.ts          # Title identity and scoped series detection
│   ├── selectors.ts         # DOM selector configuration
│   ├── dom-utils.ts         # Resilient DOM query helpers
│   ├── season-controller.ts # Shared Netflix season interaction
│   └── episode-identity.ts  # Shared episode identity parsing
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

safari/                      # macOS Safari Web Extension Xcode wrapper
```
