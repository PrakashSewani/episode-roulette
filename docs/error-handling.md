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
- Show the disabled `Loading Episode Roulette...` spawn indicator while waiting
- Wait up to 5 seconds for element to appear
- If not found, remove the indicator and don't retain a button
- Log warning to console

**Detection**: `injectButton(root, signal)` resolves `null` after the scoped five-second wait. `AbortError` removes the indicator and remains silent cancellation, not a missing-button failure.

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
- Give each season attempt one absolute 10-second safety budget covering activation, DOM transition, expansion, and stable-row validation; DOM readiness completes the operation immediately without waiting for the full timeout
- If timeout, re-query season controls and retry the same season once
- If the retry succeeds, continue discovery
- If the retry fails, fail the entire discovery operation
- Discard accumulated partial results and do not cache them
- Show the button error state and a user-facing error

**Detection**: The custom dropdown does not identify the requested season, episode content does not change from the previous snapshot, or the transition wait times out.

**Partial large-season lists**: When Netflix declares an episode count and the stable row count is lower with no expand control, treat the list as still loading. Scroll the last valid episode row into view and overflow ancestors to their bottom to encourage lazy rendering, then continue waiting within the season deadline. Do not accept the partial list.

**Named-season safety**: Non-empty named labels participate in the same discovery path as numeric seasons. Only explicitly documented action labels such as `See All Episodes` are ignored. Duplicate normalized labels or empty labels fail complete discovery. Any season that still fails after its one retry fails the entire discovery operation without caching a partial catalog.

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

## Onboarding Hooks

`background.ts` owns two best-effort hooks: opening the onboarding page once on install, and registering the uninstall survey URL.

- A missing API, a throwing call, or a rejected `chrome.tabs.create` logs a warning and is otherwise ignored.
- Failures never block the content script, never change button state, and never produce a user-facing error.
- Safari does not implement `chrome.runtime.setUninstallURL`; that hook is feature-detected and skipped.

---

## Error Logging

All errors and temporary development diagnostics use prefix `[Episode Roulette]` via `src/debug.ts`:

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

**Shipping state:** `logInfo` is silenced (a no-op) in production because verbose pre-publish tracing is no longer needed. `logWarning` and `logError` remain for real operational failures and are the only diagnostics written to the console. The popup's local `log` helper is silenced the same way.

Unhandled failures are not left to the console alone: every user-facing error also carries the report link described under Failure Reporting, which is the supported channel for users to report a broken selector.

---

## User-Facing Errors

| Scenario | Button State | Toast Message | Report link |
|----------|-------------|---------------|-------------|
| Episodic UI not confirmed | Not injected | (none — treated as a non-series title) | no |
| Season failed after retry | Error | "Could not load all seasons. Try again." | yes |
| No episodes found | Error | "No episodes found" | yes |
| Selected episode cannot be resolved | Error | "Could not open the selected episode. Try again." | yes |
| Playback did not start | Error | "Could not start playback. Try again." | yes |
| Play button not found | Not injected | (none — button doesn't appear) | no |
| General failure | Error | "Something went wrong. Try again." | yes |

Immediately after a guarded random selection, show a polite five-second status toast with the selected season, episode number or one-based position, and title when available. Any later failure replaces that status with the corresponding assertive error toast.

An error toast that carries a report link persists until the user dismisses it, clicks the link, or navigation cleanup removes it. It never auto-dismisses. Status toasts and error toasts without an action keep the five-second default.

---

## Failure Reporting

Every user-facing error offers the user a way to report it. This is the product's feedback loop for provider DOM changes: when Netflix or Prime updates their markup, the report identifies which selector class broke.

### Contract ownership

`src/report.ts` is the only module that knows the report URL, the error-code vocabulary, and how a caught error maps to report parameters. `content.ts` supplies the active provider and title identity; `feedback.ts` only renders the link it is handed.

### Report codes

| `code` | Thrown by | Typical cause |
|--------|-----------|---------------|
| `discovery` | `DiscoveryIncompleteError` | Season enumeration, activation, expansion, or validation failed after its retry |
| `no-episodes` | `NoEpisodesError` | Complete discovery produced zero eligible episodes |
| `playback-resolution` | `PlaybackResolutionError`, `CacheValidationMismatchError` | The selected season or episode row could not be re-resolved uniquely after the one cache refresh |
| `playback-timeout` | `PlaybackTimeoutError` | The episode row was clicked but provider playback was not confirmed in time |
| `unknown` | anything else | Unexpected failure |

`playback-timeout` is a typed subclass of `PlaybackResolutionError`. Message-string matching must never be used to distinguish it.

### Failure reason

When the failure was caused by a season-controller error, the report carries the exact `SeasonControllerFailureReason` as `reason`: `unsupported-layout`, `season-missing`, `strategy-mismatch`, `active-season-mismatch`, `count-mismatch`, `render-timeout`, `transition-timeout`, or `expansion-failed`. The failed season's display label is carried separately as `season` and is read from the error's structured `seasonLabel`; it is never parsed out of an error message. Prime discovery failures carry the season label but no reason.

### Report URL

```text
https://episode-roulette.prakashsewani.com/report
  ?code=discovery            # always present
  &provider=netflix          # always present: netflix | prime-video
  &titleId=81234567          # always present: provider-local title identity
  &reason=render-timeout     # only when a season-controller reason is known
  &season=Season%204         # only when the failed season label is known
  &v=1.6.0                   # only when the extension version is readable
```

The link opens in a new tab with `rel="noopener noreferrer"`. It requires no extension permission and does not involve the background worker.

### Data boundary

The URL contains only local diagnostic identifiers. It is opened only after an explicit user click, and nothing is transmitted until the user submits the form on the website. The report form discloses the exact payload before submission. No episode data, catalog contents, watch history, credentials, or browsing history is ever included. See `PRIVACY.md`.

---

## Prime Video Provider Rules

- A Prime detail route without a valid `episode-list-item` with a native `episodes-playbutton` remains unconfirmed; movies and non-episodic pages do not inject the button.
- Prime cards marked `COMING SOON`, unavailable, rental-only, purchase-only, or requiring an unapproved channel are excluded from the eligible catalog. If eligibility cannot be determined, discovery fails atomically rather than randomizing an uncertain card.
- Selecting a Prime season must resolve the requested season detail identity and wait for its episode catalog to replace the prior catalog. URL changes alone do not prove that the catalog is ready.
- Prime playback confirmation must not rely on URL changes. The provider waits for `#dv-web-player` / `div[aria-label="Web Player"]`, matching episode metadata, and a completed loading state. If the live predicate cannot be established before the provider timeout, playback fails retryably without caching session media data.
- Prime restart behavior is implemented and approved: assign `video.currentTime = 0` on the playing episode `<video>` (duration > 300 s, `readyState >= 3`, not paused) after playback confirmation. Live-verified 2026-08-15. The Netflix timeline implementation must never be reused on Prime, and the Netflix `M7375` restriction does not apply to Prime.

## Error Recovery

Phase 5's uncached integration boundary logs non-abort discovery or playback failures and returns the current button to `ready` for explicit retry. It does not yet show typed error states or toasts. The persistent error state, exact user-facing message dispatch, stale-cache invalidation, and `/watch/` timeout handling are added in Phase 6.

The extension automatically retries one failed season once during a discovery operation. If the operation still fails:

1. The button enters a persistent, enabled error state.
2. One error toast is shown for 5 seconds.
3. Clicking the error-state button dismisses the toast, changes the button to loading, and starts a fresh user-requested attempt.
4. No full operation starts automatically in the background.

Users may also refresh Netflix or navigate away and back. Navigation-triggered cancellation remains silent and must not enter the error state.
