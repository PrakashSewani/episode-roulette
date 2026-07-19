# Testing Strategy

## Overview

Episode Roulette uses a combination of unit tests and manual testing. The extension interacts with Netflix's live DOM, so full automated E2E testing is not practical.

---

## Testing Layers

### 1. Unit Tests

**Framework**: Vitest

**What to test**:
- `randomizer.ts` — Pure function, easy to test
- `selectors.ts` — Selector configuration (no DOM needed)
- `detector.ts` — URL pattern matching logic
- `dom-utils.ts` — DOM query helpers (with jsdom)

**Setup**:
```bash
npm install -D vitest jsdom
```

**Run**:
```bash
npm test
```

### 2. Manual Testing

**What to test**:
- Button injection on real Netflix
- Episode discovery across seasons
- Random playback triggering
- SPA navigation detection
- Edge cases (movies, single-season series, etc.)

**How**:
1. Load `dist/` as unpacked extension in Chrome
2. Navigate to Netflix
3. Open a TV series
4. Verify button appears, click it, verify playback starts

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

### detector.ts

```typescript
describe('detect', () => {
  it('detects series from URL', () => {
    const result = detect('https://www.netflix.com/title/80057281')
    expect(result.isSeries).toBe(true)
    expect(result.seriesId).toBe('80057281')
  })

  it('rejects non-series URLs', () => {
    const result = detect('https://www.netflix.com/browse')
    expect(result.isSeries).toBe(false)
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
- [ ] Button does NOT appear on browse page
- [ ] Button disappears when navigating away from series
- [ ] Button reappears when navigating to another series

### Button Injection
- [ ] Button is positioned next to Play button
- [ ] Button styling matches Netflix design
- [ ] Button shows loading state during discovery
- [ ] Button shows ready state after discovery
- [ ] Button shows error state on failure

### Episode Discovery
- [ ] Discovers episodes in first season
- [ ] Discovers episodes in last season
- [ ] Discovers episodes across all seasons (10+ seasons)
- [ ] Handles single-season series
- [ ] Handles series with many episodes per season

### Random Playback
- [ ] Clicking button starts playback
- [ ] Episode is truly random (test multiple times)
- [ ] Playback behaves like native Netflix (resume, buffering, etc.)
- [ ] Works after page has been open for a while

### Edge Cases
- [ ] Fast navigation between series
- [ ] Netflix loading spinner appears during discovery
- [ ] Series with special episodes
- [ ] Series with missing episode data

---

## Test Environment

- Chrome latest version
- Desktop Netflix (not TV app)
- Logged-in Netflix account
- Normal profile (not Kids)

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

Not applicable for this project (manual testing required for Netflix integration). Unit tests can be run locally before commits.
