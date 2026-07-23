# Error Handling

## Overview

Episode Roulette handles errors gracefully at every stage. The extension should never crash or show unhelpful error messages.

---

## Error Scenarios

### 1. Not a Series Page

**Condition**: User is on a movie title/detail overlay, or on a browse/search route without confirmed episodic UI.

**Handling**: Button is never injected. No error shown.

**Detection**: `getTitleContext()` returns `null`, or `detectSeries()` remains `unconfirmed` through the five-second detection deadline.

---

### 2. Play Button Not Found

**Condition**: Netflix's Play button element can't be located.

**Handling**: 
- Wait up to 5 seconds for element to appear
- If not found, don't inject button
- Log warning to console

**Detection**: `injectButton(root, signal)` resolves `null` after the scoped five-second wait. `AbortError` is silent cancellation, not a missing-button failure.

---

### 3. Episodic UI Not Confirmed

**Condition**: A Netflix title URL matched, but no episode rows appeared within the detection window.

**Handling**:
- Keep the page in candidate state while waiting
- Use one five-second deadline beginning when the title identity becomes current
- If a unique root and episode rows do not appear before the deadline, classify the page as non-series
- Do not inject the button and do not show an error; this is the expected movie-page path

**Detection**: `detector.ts` remains `candidate` until the orchestration detection window ends.

**Single-season exception**: Episode rows without a season control confirm a series. Discovery collects them as one implicit season.

---

### 4. Season Click Doesn't Update DOM

**Condition**: Selected a season from Netflix's custom dropdown but the active season identity or episode content did not update.

**Handling**:
- Give each season attempt one absolute 5-second budget covering activation, DOM transition, expansion, and stable-row validation
- If timeout, re-query season controls and retry the same season once
- If the retry succeeds, continue discovery
- If the retry fails, fail the entire discovery operation
- Discard accumulated partial results and do not cache them
- Show the button error state and a user-facing error

**Detection**: The custom dropdown does not identify the requested season, episode content does not change from the previous snapshot, or the transition wait times out.

---

### 5. No Episodes Found in Season

**Condition**: Season exists but has no episode elements in DOM.

**Handling**:
- Re-query and retry that season once because an empty list may indicate incomplete Netflix rendering
- If the retry remains empty, fail the entire discovery operation
- Discard accumulated partial results and do not cache them

**Detection**: The validated row array or collected episode array is empty.

---

### 6. Discovery Is Incomplete

**Condition**: Any enumerated season still fails after its one retry, or complete discovery produces zero episodes.

**Handling**:
- Show error state on button
- Show an appropriate discovery error toast
- Do not randomize or start playback
- Do not cache partial data
- Keep the button available for a new user-initiated retry

**Detection**: A season exhausts its retry, or total episode count is 0 after otherwise complete discovery.

---

### 7. Button Click During Discovery

**Condition**: User clicks button while episodes are still being discovered.

**Handling**:
- Button is in `loading`, sets native `disabled` and `aria-disabled="true"`, and also uses `pointer-events: none`
- Click is ignored
- The user-requested discovery operation continues

**Detection**: Button's `data-state` attribute is `loading`; `button.ts` also checks state before invoking the registered handler, so pointer and keyboard activation are both ignored. Discovery never starts before the first user click.

---

### 8. Selected Episode Cannot Be Re-Resolved

**Condition**: Playback cannot reactivate the selected season, fully expand it, or uniquely match the selected episode metadata to one current Netflix row.

**Handling**:
- Do not click any episode row
- Do not navigate to the current title-details URL as a fallback
- Show a retryable button error and toast: "Could not open the selected episode. Try again."
- A new click may run discovery again according to the cache invalidation policy

**Detection**: Season activation fails, live row count is inconsistent, or episode resolution returns zero or multiple matches.

**Typed handling**:
- Changed season identity or complete row count → `CacheValidationMismatchError`, eligible for one automatic catalog refresh
- Missing/ambiguous match with consistent catalog → `PlaybackResolutionError`, no automatic rediscovery
- Cancellation/stale generation → `AbortError`, silent

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

### 10. Playback Click Does Not Start `/watch/`

**Condition**: The verified episode row was clicked, but Netflix remains on the same title-details context for 5 seconds.

**Handling**:
- Keep the button loading during the confirmation window
- After timeout, enter retryable error state
- Show toast: "Could not start playback. Try again."

**Detection**: No route with pathname beginning `/watch/` appears before the five-second deadline, and the same operation context remains current.

---

### 11. Operation Cancelled by Netflix Navigation

**Condition**: The user changes or closes the active title, Netflix replaces the details root, playback starts, or the content script stops while detection, discovery, or playback resolution is running.

**Handling**:
- Abort the active operation immediately
- Disconnect operation-owned observers and timers
- Do not retry the interrupted season
- Do not write cache data
- Do not update the old button or show an error toast
- Let the new title context start independently

**Detection**: The operation's `AbortSignal` is aborted or its generation/title ID is no longer current.

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
| Episodic UI not confirmed | Not injected | (none — treated as a non-series title) |
| Season failed after retry | Error | "Could not load all seasons. Try again." |
| No episodes found | Error | "No episodes found" |
| Selected episode cannot be resolved | Error | "Could not open the selected episode. Try again." |
| Playback did not start | Error | "Could not start playback. Try again." |
| Play button not found | Not injected | (none — button doesn't appear) |
| General failure | Error | "Something went wrong. Try again." |

---

## Error Recovery

The extension automatically retries one failed season once during a discovery operation. If the operation still fails:

1. The button enters a persistent, enabled error state.
2. One error toast is shown for 5 seconds.
3. Clicking the error-state button dismisses the toast, changes the button to loading, and starts a fresh user-requested attempt.
4. No full operation starts automatically in the background.

Users may also refresh Netflix or navigate away and back. Navigation-triggered cancellation remains silent and must not enter the error state.

---

## Debugging

Enable verbose logging by setting in browser console:

```javascript
localStorage.setItem('ep-roulette-debug', 'true')
```

This logs all selector attempts, DOM queries, and state changes.
