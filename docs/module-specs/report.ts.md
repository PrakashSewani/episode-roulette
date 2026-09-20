# report.ts — Failure Report Contract

## Purpose

Own the failure-report URL contract: the destination, the stable error-code vocabulary, and the mapping from a caught error plus the active title context to a prefilled website URL. This module is the single source of truth for how the extension describes a failure to the outside world.

It is pure with respect to the page. It creates no DOM, starts no timers, observes nothing, reads no page content, and sends nothing. The URL it returns is only opened after an explicit user click.

---

## API

```typescript
import type { ProviderId, SeasonControllerFailureReason } from './types'

/** Canonical report form destination. Must match the website `/report` route. */
export const REPORT_BASE_URL = 'https://episode-roulette.prakashsewani.com/report'

export type ReportErrorCode =
  | 'discovery'
  | 'no-episodes'
  | 'playback-resolution'
  | 'playback-timeout'
  | 'unknown'

export interface ReportContext {
  provider: ProviderId
  titleId: string
  error: unknown
}

export interface ErrorClassification {
  code: ReportErrorCode
  reason: SeasonControllerFailureReason | null
  seasonLabel: string | null
}

/** Map a caught error to the stable report vocabulary. Never throws. */
export function classifyError(error: unknown): ErrorClassification

/** Read the running extension version, or null when unavailable. */
export function getExtensionVersion(): string | null

/** Build the prefilled report URL for a failed operation. */
export function buildReportUrl(context: ReportContext): string
```

---

## Classification

`classifyError` inspects the caught value and returns the code plus any structured failure detail carried by the error. Unknown values, non-error throws, and `null` classify as `unknown` with no reason and no season label.

| Caught error | `code` | `reason` | `seasonLabel` |
|---|---|---|---|
| `DiscoveryIncompleteError` | `discovery` | `error.reason` | `error.seasonLabel` |
| `NoEpisodesError` | `no-episodes` | `null` | `null` |
| `PlaybackTimeoutError` | `playback-timeout` | `null` | `null` |
| `PlaybackResolutionError` (not a timeout) | `playback-resolution` | `null` | `null` |
| `CacheValidationMismatchError` | `playback-resolution` | `null` | `null` |
| anything else | `unknown` | `null` | `null` |

`PlaybackTimeoutError` must be tested before `PlaybackResolutionError` because it is a subclass. Message-string matching is never used.

The reason and season label are read from the error's structured fields. `classifyError` must never parse an error message.

---

## URL Construction

`buildReportUrl` always includes:

| Param | Value |
|---|---|
| `code` | classified `ReportErrorCode` |
| `provider` | the active `ProviderId` |
| `titleId` | the active provider-local title identity |

It includes these only when known:

| Param | Value |
|---|---|
| `reason` | the `SeasonControllerFailureReason` |
| `season` | the failed season's display label |
| `v` | `getExtensionVersion()` |

Rules:

- Build through `URL` and `URLSearchParams` so labels containing spaces, `/`, `+`, or non-ASCII characters are encoded correctly.
- Never append a parameter whose value is `null`, `undefined`, or an empty string.
- Never include episode data, catalog contents, watch history, selection history, credentials, session data, or any page content beyond the identity above.
- `buildReportUrl` never throws. A failure to read the extension version omits `v` rather than failing the report.

Example:

```text
https://episode-roulette.prakashsewani.com/report?code=discovery&provider=netflix&titleId=81234567&reason=render-timeout&season=Season+4&v=1.6.0
```

---

## Extension Version

`getExtensionVersion()` reads `chrome.runtime.getManifest().version`, which returns the version injected from `package.json` at build time. The read is wrapped so that a missing runtime, a missing manifest, or a throwing API returns `null`. The version is never read from the DOM, the page, or a hardcoded literal.

---

## Consumers

`content.ts` is the only caller. It builds the URL inside its existing current-context guard, immediately before showing the error toast:

```typescript
showErrorToast(message, {
  action: {
    label: 'Report',
    href: buildReportUrl({
      provider: context.title.provider,
      titleId: context.title.titleId,
      error,
    }),
  },
})
```

`feedback.ts` renders the resulting link and does not know how it was built.

---

## Boundaries

- No DOM access, no timers, no storage, no messaging, and no network request.
- No dependency on `ui/*`, discovery, navigation, or provider modules.
- The destination host is not an extension host permission and must never be added to the manifest.
- `REPORT_BASE_URL` and the website route are one contract: changing either requires updating both repositories and this spec.

---

## Testing

- Unit test: each documented error class classifies to its documented code
- Unit test: `PlaybackTimeoutError` classifies as `playback-timeout`, not `playback-resolution`
- Unit test: reason and season label are taken from a structured `DiscoveryIncompleteError`
- Unit test: unknown values, strings, `null`, and `undefined` classify as `unknown` without throwing
- Unit test: a named season label containing `/` and spaces is correctly encoded
- Unit test: `reason`, `season`, and `v` are omitted when unknown
- Unit test: a missing or throwing `chrome.runtime.getManifest` omits `v` instead of failing
- Unit test: `code`, `provider`, and `titleId` are always present
- Integration test: a failed roll produces a toast whose action link carries the expected `code`, `provider`, and `titleId`
