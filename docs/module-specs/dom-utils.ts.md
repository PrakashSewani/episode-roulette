# dom-utils.ts — Resilient DOM Query Helpers

## Purpose

Provide generic DOM query utilities that try caller-supplied selector strategies. This module contains no Netflix-specific selectors or behavior.

---

## Responsibilities

1. Query DOM with fallback selectors
2. Wait for elements to appear (async)
3. Make every asynchronous wait abortable
4. Provide typed wrappers for common operations

`dom-utils.ts` must not import `selectors.ts`. Feature modules choose Netflix selector configurations and pass their arrays and scoped roots into these helpers.

---

## API

### resilientQuery

```typescript
/**
 * Try multiple selectors in order. Return first match.
 * @param selectors - Ordered list of CSS selectors to try
 * @param parent - Parent element to search within (default: document)
 * @returns First matching element, or null if none found
 */
export function resilientQuery(
  selectors: string[],
  parent?: Element | Document
): Element | null
```

**Behavior**:
- Try each selector in order
- Return first non-null result
- Log which selector succeeded (for debugging)
- Return null if all selectors fail

### resilientQueryAll

```typescript
/**
 * Try multiple selectors. Return all matches from the first selector that works.
 * @param selectors - Ordered list of CSS selectors to try
 * @param parent - Parent element to search within (default: document)
 * @returns All matching elements, or empty array
 */
export function resilientQueryAll(
  selectors: string[],
  parent?: Element | Document
): Element[]
```

### waitForElement

```typescript
/**
 * Wait for an element to appear in the DOM.
 * @param selectors - Ordered list of CSS selectors to try
 * @param timeout - Max wait time in ms (default: 5000)
 * @param parent - Parent element to observe (default: document.body)
 * @param signal - Cancels the wait and cleans up immediately
 * @returns Promise resolving to the element, or null on timeout
 */
export function waitForElement(
  selectors: string[],
  timeout?: number,
  parent?: Element,
  signal?: AbortSignal,
): Promise<Element | null>
```

**Behavior**:
- Immediately check if element exists
- If not, set up MutationObserver on parent
- Check on each DOM mutation
- Resolve with the element when found
- Resolve with `null` after timeout
- Reject with a DOM `AbortError` when the signal is aborted
- Clean up observer, timer, and abort listener in every case

### getTextContent

```typescript
/**
 * Get text content from an element matched by one of the selectors.
 * @param selectors - Ordered list of CSS selectors to try
 * @param parent - Parent element to search within
 * @returns Trimmed text content, or null if not found
 */
export function getTextContent(
  selectors: string[],
  parent: Element
): string | null
```

---

## Implementation Notes

- All functions should log selector successes for debugging
- `waitForElement` must clean up MutationObserver, timeout, and abort listener on success, timeout, and cancellation
- Synchronous not-found queries return null; asynchronous cancellation is the only expected rejection and uses `AbortError`
- Use `requestAnimationFrame` for UI-related waits to avoid blocking

---

## Edge Cases

| Case | Behavior |
|------|----------|
| All selectors fail | Return null (no error thrown) |
| Element appears after timeout | Observer cleaned up, null returned |
| Multiple elements match | Return first match (use `resilientQueryAll` for all) |
| Parent element removed from DOM | Resolve null and explicitly disconnect the observer |
| Signal already aborted | Reject immediately with `AbortError`; do not create an observer |
| Signal aborts during wait | Reject with `AbortError` and clean up all resources |

---

## Testing

- Unit test: `resilientQuery` with mock DOM (jsdom)
- Unit test: `waitForElement` with async DOM changes
- Unit test: Timeout resolves null without rejecting
- Unit test: Abort rejects with `AbortError` and disconnects observer/timer
- Manual test: Verify selectors work on real Netflix
