# Testing Strategy

## Overview

Episode Roulette uses unit tests, jsdom fixture integration tests, and focused manual validation on live Netflix. Automated tests cover the complete documented lifecycle without depending on a real Netflix account. Live authenticated Netflix is a manual smoke layer because production E2E would require session management and would be brittle against Netflix deployment changes.

---

## Testing Layers

### 1. Unit Tests

**Framework**: Vitest

**What to test**:
- `randomizer.ts` — Pure function, easy to test
- `selectors.ts` — Selector configuration (no DOM needed)
- `detector.ts` — Title identity extraction and scoped episodic-DOM classification
- `observer.ts` — Neutral route events and observer scope transitions
- `dom-utils.ts` — DOM query helpers (with jsdom)
- `season-controller.ts` — Enumeration, already-active activation, switching, expansion, and deadlines
- `episode-identity.ts` — Normalization, parsing conflicts, and deterministic matching
- `button.ts` — Scoped injection and retryable states
- `feedback.ts` — Toast replacement and stale-timer guards

**Setup**:
```bash
npm install -D vitest jsdom
```

**Run**:
```bash
npm test
```

### 2. Fixture Integration Tests

**Framework**: Vitest with jsdom and fake timers

**Purpose**: Exercise multiple modules together against reusable Netflix DOM fixtures. Fixtures reproduce only the structures and transitions observed and documented for Netflix desktop; they must not duplicate implementation logic.

**Required fixtures**:

- Browse page with no active title details
- Movie `jbv` detail modal without episodic UI
- Implicit single-season detail modal
- Multi-season custom-dropdown detail modal
- Open dropdown menu with season counts and `See All Episodes`
- Truncated 10-row season with `section-expand`
- Fully expanded season
- Replaced/removed title-details root
- Hidden, disconnected, and multiple simultaneous dialog candidates
- Ambiguous and missing episode identity rows

**Required integration scenarios**:

- Route identity plus scoped DOM confirmation
- Unique visible validated title-root resolution
- Movie overlay never injects the button
- Five-second detection expiry stops observation without an error
- Series overlay injects one ready button
- Confirmed series shows one disabled spawn indicator while scoped Play-button placement is pending
- Spawn indicator is replaced by the ready button, and timeout/cancellation leaves no indicator
- User click starts discovery; opening the overlay alone does not
- Custom-dropdown enumeration, switching, expansion, and exact count validation
- One season retry followed by success or atomic failure
- Implicit-season failure uses the same one retry
- English season/count parser ignores only known actions; unsupported selectable labels and duplicate keys fail safely
- A-to-B route cancellation and stale-generation suppression
- Liveness-observer direct/ancestor root-removal detection while route watching remains active
- Idempotent start/stop and pagehide teardown
- Stale generation rejected immediately before cache writes
- Complete catalog cache reuse and one mismatch-triggered rediscovery
- Independent random selection with no history
- Season reactivation, unique row resolution, and final guarded click
- Five-second `/watch/` confirmation after final click
- Retryable error state and five-second toast behavior
- Manifest/build contract contains the Netflix content script and no background service worker

Tests use fake timers for polling, debouncing, five-second waits, and toast dismissal. Every test restores timers, DOM, observers, and module state.

### 3. Manual Netflix Validation

**What to test**:
- Button injection on real Netflix
- Episode discovery across seasons
- Random playback triggering
- SPA navigation detection
- Edge cases (movies, single-season series, etc.)

**How**:
1. Load `dist/webextension/` as an unpacked extension in Chrome.
2. Build and run the `safari/` wrapper from Xcode, then enable the extension in Safari Settings.
3. In each browser, navigate to Netflix and open the same supported TV series.
4. Verify button injection, complete discovery, and native playback in each browser.

Manual validation confirms that documented selectors and interaction assumptions still match Netflix. It does not replace automated lifecycle assertions.

The first complete Chrome live run is the dedicated Phase 7 compatibility gate. Phase 8 repeats the required Chrome and Safari smoke checks as part of final release validation after all automated and packaging gates pass.

Live automated browser E2E against Netflix is explicitly out of scope for the first release. Chrome and Safari both require manual authenticated smoke validation.

---

## Unit Test Cases

### randomizer.ts

```typescript
describe('pickRandom', () => {
  it('returns an element from the array', () => {
    const episodes = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const result = pickRandom(episodes)
    expect(episodes).toContain(result)
  })

  it('throws on empty array', () => {
    expect(() => pickRandom([])).toThrow('empty array')
  })

  it('returns the only element for single-item array', () => {
    const episodes = [{ id: 1 }]
    expect(pickRandom(episodes)).toBe(episodes[0])
  })
})
```

---

## Test Organization

```text
tests/
├── fixtures/
│   ├── browse.ts
│   ├── movie-details.ts
│   ├── implicit-season.ts
│   └── dropdown-series.ts
├── unit/
│   ├── detector.test.ts
│   ├── dom-utils.test.ts
│   ├── observer.test.ts
│   ├── season-controller.test.ts
│   ├── episode-identity.test.ts
│   ├── button.test.ts
│   ├── feedback.test.ts
│   ├── randomizer.test.ts
│   └── selectors.test.ts
└── integration/
    ├── content-lifecycle.test.ts
    ├── season-traversal.test.ts
    ├── cache.test.ts
    └── playback.test.ts
```

Fixtures expose builders rather than static shared DOM nodes so each test receives an isolated document state. Netflix selector strings used by fixtures should describe the simulated external DOM; assertions must exercise production selectors and behavior.

### detector.ts

```typescript
describe('detect', () => {
  it('detects a title-page candidate from a title path', () => {
    const context = getTitleContext('https://www.netflix.com/title/80057281')
    expect(context?.titleId).toBe('80057281')
    expect(context?.source).toBe('title-path')
  })

  it('detects a title-details candidate from a browse overlay', () => {
    const context = getTitleContext('https://www.netflix.com/browse/genre/83?jbv=81598435')
    expect(context?.titleId).toBe('81598435')
    expect(context?.source).toBe('jbv')
  })

  it('rejects non-title URLs', () => {
    expect(getTitleContext('https://www.netflix.com/browse')).toBeNull()
  })

  it('confirms a series inside the supplied details root', () => {
    const root = document.createElement('div')
    root.innerHTML = '<div data-uia="episode-selector"><div data-uia="titleCard--container" role="button"></div></div>'
    const context = getTitleContext('https://www.netflix.com/title/80057281')!
    const result = detectSeries(context, root)
    expect(result.status).toBe('series')
  })

  it('ignores episode rows outside the supplied details root', () => {
    document.body.innerHTML = '<div data-uia="titleCard--container" role="button"></div><div id="details"></div>'
    const root = document.querySelector('#details')!
    const context = getTitleContext('https://www.netflix.com/title/80057281')!
    expect(detectSeries(context, root).status).toBe('unconfirmed')
  })
})
```

### dom-utils.ts

```typescript
describe('resilientQuery', () => {
  it('returns first matching element', () => {
    document.body.innerHTML = '<div id="test"></div>'
    const result = resilientQuery(['#test', '#missing'])
    expect(result?.id).toBe('test')
  })

  it('returns null when no match', () => {
    const result = resilientQuery(['#missing1', '#missing2'])
    expect(result).toBeNull()
  })
})
```

---

## Manual Test Checklist

### Series Detection
- [ ] Button appears on TV series page
- [ ] Button does NOT appear on movie page
- [ ] A `/title/<id>` or `?jbv=<id>` URL without episodic UI remains a candidate and does not inject the button
- [ ] Movie details opened through `?jbv=<id>` do not inject the button
- [ ] Series details opened through `?jbv=<id>` inject the button after episodic UI appears
- [ ] Episode-like elements in browse carousels do not confirm the open title as a series
- [ ] Detection queries are scoped to the active title-details container
- [ ] Closing or replacing a details overlay disconnects its scoped observer
- [ ] Episode rows confirm a series even when no season control exists
- [ ] Button does NOT appear on a browse page without an open series details overlay
- [ ] Button disappears when navigating away from series
- [ ] Button reappears when navigating to another series

### Button Injection
- [ ] Button is positioned next to Play button
- [ ] A confirmed series shows disabled `Loading Episode Roulette...` feedback while Play-button placement is pending
- [ ] The temporary indicator disappears on timeout, cancellation, or ready-button placement
- [ ] Button styling matches Netflix design
- [ ] Button is enabled and ready before discovery has run
- [ ] Opening a confirmed series does not switch seasons in the background
- [ ] First click immediately changes the button to loading
- [ ] Button shows loading state throughout discovery
- [ ] Button shows error state on failure
- [ ] Error-state button remains enabled and clickable
- [ ] Clicking error dismisses the toast and transitions immediately to loading
- [ ] Error toast auto-dismisses after 5 seconds
- [ ] Navigation cancellation does not show an error or toast

### Episode Discovery
- [ ] Discovers episodes in first season
- [ ] Discovers episodes in last season
- [ ] Discovers episodes across all seasons (10+ seasons)
- [ ] Handles single-season series
- [ ] Treats an episode list without season controls as one implicit season
- [ ] Handles series with many episodes per season
- [ ] Enumerates all seasons from Netflix's custom dropdown menu
- [ ] Ignores non-season dropdown entries such as "See All Episodes"
- [ ] Confirms the requested season from dropdown toggle text and changed episode content
- [ ] Expands an initially truncated 10-row episode section
- [ ] Matches the final row count to Netflix's declared season count when available
- [ ] Retries a failed season once after re-querying its Netflix control
- [ ] Continues when the one retry succeeds
- [ ] Fails the complete operation when the retry also fails
- [ ] Never randomizes or caches a partial episode set
- [ ] Reopening a previously discovered series reuses its complete in-memory catalog
- [ ] Closing a details overlay does not erase a valid catalog
- [ ] Refreshing or closing the Netflix tab clears the in-memory catalog naturally

### Random Playback
- [ ] Clicking button starts playback
- [ ] Episode is truly random (test multiple times)
- [ ] Repeat selections are allowed
- [ ] Selection probability is not affected by prior clicks or playback
- [ ] No selected or played episode history is stored
- [ ] Live cached-metadata mismatch invalidates one series and triggers at most one fresh discovery
- [ ] Selected season is reactivated before playback
- [ ] Selected episode is re-resolved from durable metadata, not a cached DOM element
- [ ] Number and normalized title identify the correct live row
- [ ] Index fallback is allowed only when complete-season row counts match
- [ ] Ambiguous or missing matches do not click any episode
- [ ] No fallback navigates to the series details URL
- [ ] Playback behaves like native Netflix (resume, buffering, etc.)
- [ ] Button stays loading until Netflix enters `/watch/`
- [ ] Missing `/watch/` transition after 5 seconds becomes a retryable error
- [ ] Works after page has been open for a while

### Edge Cases
- [ ] Fast navigation between series
- [ ] Direct title A to title B navigation aborts A before B starts
- [ ] Closing the `jbv` overlay aborts discovery without an error toast
- [ ] Entering `/watch/` invalidates title-details work
- [ ] Late results from an old generation cannot update current UI or cache
- [ ] Abort between playback resolution steps prevents the final episode click
- [ ] `pagehide` stops observers, aborts work, clears UI, feedback, and in-memory cache
- [ ] Slow Netflix season rendering is handled by identity, content-change, and stable-count waits
- [ ] Series with special episodes
- [ ] Series with missing episode data

---

## Test Environment

- Latest stable desktop Chrome
- Latest stable macOS Safari and current Xcode supported by the development machine
- Desktop Netflix (not TV app)
- Logged-in Netflix account
- Normal profile (not Kids)
- Netflix UI language set to English

Netflix Kids profiles are outside first-release scope. They require separate live DOM observation, selector evidence, fixture coverage, and manual validation before support is claimed.

Non-English Netflix UI is outside first-release scope because the verified custom dropdown exposes season and episode counts through localized text. Each additional language requires observed label/count formats and fixture coverage before support is claimed.

iOS and iPadOS Safari are outside first-release scope. Their Netflix layouts, extension lifecycle, and packaging require separate observation and testing.

---

## Reporting Issues

When a test fails, document:
1. What was tested
2. What was expected
3. What actually happened
4. Netflix URL where issue occurred
5. Browser console logs (if any)

---

## Continuous Integration

Automated unit and fixture integration tests must run non-interactively in CI on every pull request.

CI uses Node 24 LTS as pinned by `.nvmrc` and `package.json#engines`, then installs from the committed lockfile with `npm ci`. The macOS job uses a runner with full Xcode selected and verifies `xcodebuild` availability before Safari packaging validation.

Required CI commands:

```bash
npm test
npm run build
```

The macOS CI job additionally runs:

```bash
npm run safari:build
```

Release readiness requires:

- All unit tests pass
- All fixture integration tests pass
- Production build succeeds
- Chrome loads the universal manifest/build without browser-specific rewriting
- `safari/Extension/Resources/` has identical relative regular-file paths and bytes to `dist/webextension/`, with no extra files and no nested `webextension/` directory
- Safari Xcode wrapper builds unsigned on macOS CI
- Manual Netflix smoke checklist passes on latest desktop Chrome and a locally signed macOS Safari build using logged-in normal profiles

Live Netflix credentials and sessions must never be stored in the repository or CI.

The manifest/build assertion requires:

- No `background` field or `service_worker`
- A content script matching `*://*.netflix.com/*`
- Netflix host permissions and no broader host permission

The Safari package assertion requires:

- The wrapper embeds `safari/Extension/Resources/`, which exactly mirrors `dist/webextension/`
- The Safari extension requests Netflix website access only
- No duplicated product source exists under `safari/`
- Generated `safari/Extension/Resources/` is reproducible, ignored, and contains no tracked files
- The `manifest.json` loaded by Chrome and its mirrored Safari copy are byte-identical and contain the product version sourced from `package.json`
- Native app and extension `MARKETING_VERSION` values equal the package version; `CURRENT_PROJECT_VERSION` equals the validated positive integer build number
- The built Safari extension bundle contains `manifest.json` and the generated content-script asset
- The built extension has resource-relative `manifest.json` under `${UNLOCALIZED_RESOURCES_FOLDER_PATH}` with no extra nested `Resources/manifest.json`
- `xcodebuild -project safari/EpisodeRoulette.xcodeproj -scheme EpisodeRoulette -configuration Debug CODE_SIGNING_ALLOWED=NO build` succeeds
