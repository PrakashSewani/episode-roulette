# Error Handling

## Overview

Episode Roulette handles errors gracefully at every stage. The extension should never crash or show unhelpful error messages.

---

## Error Scenarios

### 1. Not a Series Page

**Condition**: User is on a movie page, browse page, or search results.

**Handling**: Button is never injected. No error shown.

**Detection**: `detector.ts` returns `isSeries: false`.

---

### 2. Play Button Not Found

**Condition**: Netflix's Play button element can't be located.

**Handling**: 
- Wait up to 5 seconds for element to appear
- If not found, don't inject button
- Log warning to console

**Detection**: `resilientQuery(PLAY_BUTTON.selectors)` returns null.

---

### 3. Season Selector Not Found

**Condition**: Can't find season tabs/dropdown on a series page.

**Handling**:
- Wait up to 5 seconds for element to appear
- If not found, show error state on button
- Show toast: "Could not find seasons for this show"

**Detection**: `resilientQuery(SEASON_TABS.selectors)` returns null.

---

### 4. Season Click Doesn't Update DOM

**Condition**: Clicked a season tab but episodes didn't load.

**Handling**:
- Wait up to 5 seconds for DOM update (MutationObserver)
- If timeout, skip that season
- Log warning
- Continue with other seasons

**Detection**: `waitForElement(EPISODE_ROW.selectors, 5000)` returns null.

---

### 5. No Episodes Found in Season

**Condition**: Season exists but has no episode elements in DOM.

**Handling**:
- Skip that season
- Don't include in results
- Log info message

**Detection**: `collectEpisodes()` returns empty array.

---

### 6. All Seasons Fail

**Condition**: No episodes discovered from any season.

**Handling**:
- Show error state on button
- Show toast: "No episodes found"
- Don't enable button click

**Detection**: Total episode count is 0 after discovery.

---

### 7. Button Click During Discovery

**Condition**: User clicks button while episodes are still being discovered.

**Handling**:
- Button is in "loading" state with `pointer-events: none`
- Click is ignored
- Discovery continues in background

**Detection**: Button's `data-state` attribute is "loading".

---

### 8. Episode Element Stale (Navigation)

**Condition**: DOM re-rendered after episode discovery, element references are stale.

**Handling**:
- `navigator.ts` checks `document.body.contains(episode.element)`
- If not found, fall back to URL navigation
- Log info message

**Detection**: `document.body.contains(element)` returns false.

---

### 9. Netflix UI Structure Changed

**Condition**: Netflix updated their DOM, selectors no longer work.

**Handling**:
- All queries return null
- Extension gracefully degrades (button doesn't appear, or shows error)
- User reports issue
- Developer updates `selectors.ts`

**Detection**: Console logs show selector failures.

---

## Error Logging

All errors are logged to console with prefix `[Episode Roulette]`:

```typescript
function logError(message: string, details?: unknown): void {
  console.error(`[Episode Roulette] ${message}`, details)
}

function logWarning(message: string, details?: unknown): void {
  console.warn(`[Episode Roulette] ${message}`, details)
}

function logInfo(message: string, details?: unknown): void {
  console.log(`[Episode Roulette] ${message}`, details)
}
```

---

## User-Facing Errors

| Scenario | Button State | Toast Message |
|----------|-------------|---------------|
| Season selector not found | Error | "Could not find seasons for this show" |
| Season click failed | Error (for that season) | "Could not load some seasons" |
| No episodes found | Error | "No episodes found" |
| Play button not found | Not injected | (none — button doesn't appear) |
| General failure | Error | "Something went wrong. Try again." |

---

## Error Recovery

The extension doesn't retry automatically. Users can:
1. Refresh the page
2. Navigate away and back to the series
3. Click the button again after a moment

---

## Debugging

Enable verbose logging by setting in browser console:

```javascript
localStorage.setItem('ep-roulette-debug', 'true')
```

This logs all selector attempts, DOM queries, and state changes.
