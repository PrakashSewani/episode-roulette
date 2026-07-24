# Maintenance Playbook

## General Method

For every non-trivial change:

1. Read `AGENTS.md` and current tracker status.
2. Read the relevant normative specs.
3. Read the corresponding KT section for implementation impact.
4. Inspect current source and tests before proposing a change.
5. Identify ambiguity or contradiction before coding.
6. Update authoritative docs first when behavior or architecture must change.
7. Present a brief implementation plan and wait for confirmation.
8. Make the smallest correct change.
9. Add or update tests at the contract boundary.
10. Run verification and record evidence.

Do not use this playbook to bypass the repository's approval workflow.

## Selector Failure

Symptoms:

- Button no longer appears
- Movie or series detection changes
- Season menu cannot be found
- Episode rows are empty
- Playback cannot resolve a row
- Console logs show selector failures

Investigation:

1. Reproduce on current desktop Netflix with English UI.
2. Capture title URL, title type, profile type, browser version, and visible DOM state.
3. Determine which boundary failed: active root, episodic confirmation, Play placement, season control, expansion, title/number parsing, or playback row.
4. Inspect candidates only within the documented scope root.
5. Record dated evidence in `docs/selectors-reference.md`.
6. Check whether the change is a selector-only change or a different interaction model.

Selector-only change:

1. Update `docs/module-specs/selectors.ts.md`.
2. Update `src/netflix/selectors.ts`.
3. Update selector and affected module tests.
4. Run detection, season, traversal, navigator, build, and package checks.

Interaction-model change:

- Stop and document the new behavior in the appropriate module spec and architecture.
- Do not force a new dropdown, virtualization, pagination, or playback model into an old selector fallback.

Avoid:

- Querying `document` to make a scoped failure disappear
- Adding selectors directly to feature modules
- Using unstable dynamic CSS classes without evidence and fallbacks
- Selecting the first of multiple roots, menus, or episode lists

## Route or Navigation Failure

Symptoms:

- Overlay opens but no detection begins
- Closing an overlay leaves stale UI
- Moving from title A to B shows A's result
- Playback starts but old UI remains

Check:

1. Does the URL change through `jbv`, path, hash, or history state?
2. Does 500 ms polling observe the actual full URL change?
3. Does `getTitleContext()` return the expected identity?
4. Is `/watch/` correctly excluded?
5. Is the old context aborted before the new one begins?
6. Is generation incremented?
7. Are old debounced observer callbacks suppressed?
8. Is playback confirmation resolved by the route event?

Never remove polling because event listeners appear sufficient in one reproduction.

## Root Resolution Failure

Symptoms:

- No button despite visible details
- Multiple overlays prevent activation
- Hidden dialog is selected
- Root replacement causes stale operations

Check candidates against the exact root algorithm:

- Connected
- Visible by layout and computed style
- Contains Play or metadata structure
- Exactly one valid candidate

If Netflix introduces a stable title identifier on the root, record evidence and update the normative algorithm before using it.

## Detection Timing Failure

The five-second detection budget is absolute. Do not restart it on every mutation.

When a valid series renders after the deadline, determine whether:

- Current Netflix behavior now routinely exceeds the documented budget
- Root selection is failing earlier
- A selector or visibility assumption is wrong

Changing the deadline is a product behavior change requiring documentation and tests, not a local timeout tweak.

## Button Injection Failure

Symptoms:

- Spawn indicator remains
- Indicator disappears but operational button never appears
- Duplicate buttons appear
- Button is placed beside the wrong control

Check:

1. Series confirmation occurred once.
2. Spawn indicator belongs to the current root.
3. Play lookup is scoped to that root.
4. Play appears within the separate five-second placement wait.
5. A newer pending root has not superseded the old one.
6. Existing owned button cleanup is working.

The current flow does not automatically retry Play placement forever after timeout. If current Netflix behavior requires a different policy, document it before implementation.

## Season Enumeration Failure

Symptoms:

- Missing seasons
- Action item treated as season
- Named season rejected
- Duplicate normalized keys
- Counts not parsed

Check:

1. Toggle is inside the episode selector.
2. Menu is resolved within the active title root.
3. Every currently rendered menu item is inspected.
4. Label normalization matches the shared rules.
5. Numeric and named identity are distinguished correctly.
6. Only documented actions are ignored.
7. Duplicate keys fail rather than merge.
8. English count line matches the documented complete-line format.

Do not add guessed action labels to the denylist. Observe and document them first.

## Season Transition Failure

Symptoms:

- Wrong season collected
- Netflix replaces the selector and code uses stale DOM
- Transition completes on one temporary row
- Deadline seems to reset

Check:

1. Previous row snapshot was captured before menu interaction.
2. Requested menu item was re-queried after opening the menu.
3. Title root is observed for complete selector replacement.
4. Exactly one current live selector is resolved.
5. Active toggle identifies the requested season.
6. Row snapshot differs for a real switch.
7. Declared multi-episode seasons have at least two valid rows before readiness.
8. Activation and expansion share one caller-owned deadline.

Always use the selector returned by `activateSeason()`.

## Expansion or Stability Failure

Symptoms:

- Only first ten episodes collected
- `Episode rows did not stabilize`
- Continuous thumbnails prevent completion
- Declared count mismatch

Check:

1. Expand control exists and is clicked at most once per attempt.
2. Expand control disappears.
3. Valid row identity snapshot changes as episodes render.
4. Unrelated image, progress, or layout mutations do not alter the identity snapshot.
5. Snapshot remains unchanged across two frames.
6. Exact expected count is enforced when declared.

Do not accept a partial stable list merely to avoid timeout. Completeness is part of the product promise.

## Episode Identity Failure

Symptoms:

- Wrong episode clicked
- Duplicate title is ambiguous
- Episode number conflict
- Index fallback behaves unexpectedly

Check:

1. Discovery and playback use the same parser.
2. Title source precedence is preserved.
3. Every configured number source is inspected.
4. Conflicting numbers disable strong number matching.
5. Number-plus-title is attempted before title-only.
6. Multiple matches at a stronger tier fail immediately.
7. Index fallback is used only without stronger usable identity and with equal complete row counts.

Never weaken ambiguity handling to improve apparent success rate.

## Cache Failure

Symptoms:

- Overlay close forces full traversal again
- Stale catalog loops discovery
- Wrong title uses another title's data
- Partial catalog is retained

Check:

1. Only `content.ts` touches the cache.
2. The write occurs after complete discovery and current-context guard.
3. Overlay close does not clear the cache.
4. `stop()` and `pagehide` clear it.
5. Stale playback invalidates only the current title.
6. Automatic rediscovery occurs at most once.
7. A refreshed catalog receives a fresh independent selection.

Do not add TTL, persistence, history, or cross-tab storage without approved design.

## Cancellation or Stale-Side-Effect Failure

Symptoms:

- Old title shows a toast on the new title
- Old discovery writes cache after navigation
- Playback occurs after overlay close
- Abort appears as an error

Every asynchronous path must check:

- `signal.aborted`
- Active generation
- Active title identity
- Expected active root where relevant

Required side-effect guard points:

- Button state changes
- Toast changes
- Cache writes
- Random selection
- Playback call
- Final native click

Abort is expected control flow. Do not convert it into a product error or retry it.

## Playback Failure

Symptoms:

- Selected season does not reactivate
- Row cannot be found
- Wrong row is clicked
- Click occurs but `/watch/` does not start

Separate the failure stage:

1. Live episode selector resolution
2. Season strategy/identity validation
3. Expansion and count validation
4. Episode identity resolution
5. Final current-context guard
6. Native click
7. `/watch/` confirmation

Stale catalog evidence may trigger one rediscovery. Structural or ambiguous playback failures do not automatically rediscover unless the typed error contract says metadata is stale.

There is no URL fallback in the Netflix implementation.

## Test Failure Triage

When fake-timer tests hang:

- Confirm timers are restored after each test.
- Check whether `requestAnimationFrame` and timeout deadlines both need advancing.
- Check for an unresolved MutationObserver wait.
- Check whether module import auto-started orchestration before mocks were installed.

When visibility tests fail:

- Review `tests/setup.ts` and `data-test-hidden` behavior.
- Remember jsdom has no real layout boxes.

When integration mocks leak:

- Reset modules before dynamically importing `content.ts`.
- Restore all mocks and clear document state.

## Safari Build Failure

Determine which layer failed:

1. Universal WebExtension build
2. Resource synchronization
3. Generated version settings
4. Xcode project configuration
5. Unsigned compilation
6. Built resource layout assertion
7. Local signing or runtime permission

Do not run `safari:init` for normal failures. Do not commit generated resources or local signing configuration.

For a built-resource assertion failure, inspect scheme-level DerivedData settings rather than assuming a target-local `safari/build/Debug` path.

## Documentation Drift

Historical phase descriptions may describe intentionally incomplete earlier behavior. Current behavior is defined by completed later phases and current normative module specs.

If code and docs appear to disagree:

1. Identify whether the statement is normative, historical, illustrative, or observational.
2. Prefer the most specific current normative spec.
3. Do not silently align code to a likely interpretation.
4. Ask the user when the difference affects behavior.
5. Update the authoritative document first.
6. Then update code, tests, tracker, and this KT explanation.

Known areas that deserve careful inspection rather than assumptions include:

- Combined single-line season label/count handling
- The exact MutationObserver versus animation-frame role in row stability
- Historical numeric-season-only statements from earlier phases
- Example test organization versus the actual current test files
- Type checking being locally required but not currently a distinct CI step

These notes do not authorize changing behavior. They identify places where a future task may require clarification.
