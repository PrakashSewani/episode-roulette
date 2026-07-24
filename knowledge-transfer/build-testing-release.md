# Build, Testing, and Release

## Toolchain

- Node 24 LTS is pinned by `.nvmrc` and `package.json#engines`.
- Dependencies are installed reproducibly with `npm ci` in CI.
- TypeScript is strict and targets ES2020.
- Vite and CRXJS produce the Manifest V3 WebExtension.
- Vitest and jsdom provide unit and fixture integration tests.
- Xcode provides the macOS Safari wrapper build.

Use the Node version declared by the repository. Do not solve engine failures by weakening the engine declaration.

## Core Commands

| Command | Purpose |
|---|---|
| `npx tsc --noEmit` | Strict type check |
| `npm test` | Run all Vitest unit and fixture integration tests |
| `npm run build` | Produce the universal WebExtension |
| `npm run assert:webextension` | Validate the already-built WebExtension package |
| `npm run safari:sync` | Rebuild and mirror resources into the Safari wrapper |
| `npm run safari:build` | Synchronize resources and build the unsigned Xcode scheme |
| `npm run assert:safari` | Validate synchronized and built Safari resources |
| `npm run safari:init` | Guarded one-time wrapper bootstrap; not a normal command |

Recommended full local release chain:

```bash
npx tsc --noEmit && \
npm test && \
npm run build && \
npm run assert:webextension && \
npm run safari:build && \
npm run assert:safari && \
git diff --check
```

Run only commands supported by the current machine. Record any skipped macOS/Xcode checks explicitly.

## Universal WebExtension

Build flow:

```text
src/manifest.ts + src/content.ts module graph
  -> Vite/CRXJS
  -> dist/webextension/
```

`dist/webextension/` is generated and ignored. Chrome loads this directory unchanged through `chrome://extensions`.

The package assertion verifies:

- Manifest version 3
- Version matches `package.json`
- Netflix-only current host access
- Netflix-only current content-script matching
- No extension permissions
- No optional host permissions
- No background or service worker
- Every declared script and resource exists
- No nested WebExtension package

When a future provider is approved, the assertion must move from a hardcoded Netflix pattern to an explicit approved host allowlist. It must not be weakened to accept arbitrary hosts.

## Safari Packaging

### Architecture

```text
dist/webextension/
  -> verified mirror
  -> safari/Extension/Resources/
  -> Xcode extension bundle resources
```

The `safari/` directory is a native wrapper, not a second implementation.

Authoritative ownership:

| Area | Owner |
|---|---|
| Manifest structure | `src/manifest.ts` |
| Runtime behavior | `src/` |
| Product version | `package.json` |
| Apple project metadata | Committed non-generated files under `safari/` |
| Mirrored WebExtension resources | Generated `safari/Extension/Resources/` |
| Native marketing/build values | Generated `safari/GeneratedVersion.xcconfig` |
| Local team and bundle overrides | Ignored `safari/LocalSigning.xcconfig` |

### Normal Flow

`npm run safari:sync`:

1. Runs the production WebExtension build.
2. Creates a sibling temporary resource mirror.
3. Verifies every relative regular-file path and byte.
4. Promotes the mirror with backup/restore protection.
5. Verifies the promoted destination.
6. Writes generated native version settings.

`npm run safari:build` then runs:

```text
xcodebuild
  -project safari/EpisodeRoulette.xcodeproj
  -scheme EpisodeRoulette
  -configuration Debug
  CODE_SIGNING_ALLOWED=NO
  build
```

The Xcode extension target copies the contents of `safari/Extension/Resources/` into the extension resource root. The built path contains `manifest.json` directly under the resource directory, not under an extra nested `Resources/` or `webextension/` directory.

### One-Time Bootstrap

`npm run safari:init` exists only to recreate the wrapper through Apple's converter under the exact documented and guarded conditions. It refuses to merge into an existing wrapper. Do not run it to fix an ordinary build problem.

If wrapper regeneration becomes necessary under a newer Xcode, update and approve `docs/safari.md` and the bootstrap script before running it.

### Generated and Local Files

These are intentionally ignored:

- `dist/`
- `safari/Extension/Resources/`
- `safari/GeneratedVersion.xcconfig`
- `safari/LocalSigning.xcconfig`
- Xcode user state and DerivedData

Do not commit signing team IDs, certificates, provisioning profiles, credentials, or local bundle identifiers.

## Test Layers

### Unit Tests

Unit tests cover selectors, URL interpretation, observer mechanics, DOM utilities, season control, episode identity, collection, UI state, feedback, styles, random selection, and navigation.

### Fixture Integration Tests

Integration tests exercise:

- Full orchestration with mocked discovery/playback boundaries
- Real season controller, collector, identity, and traversal behavior against jsdom fixtures
- Cancellation, stale generations, root replacement, cache survival, one stale refresh, retry, and teardown

Fixture rules:

- Build isolated DOM for every test.
- Describe observed external DOM rather than reproducing implementation logic.
- Use production selectors and behavior in assertions.
- Restore timers, DOM, observers, and module state.

### Package Assertions

Package assertions are external release checks, not Vitest cases. They inspect generated outputs and Xcode products, which is more reliable than testing source declarations alone.

### Manual Live Validation

Automated tests cannot prove current Netflix DOM compatibility or authenticated playback. Manual validation remains required in current desktop Chrome and macOS Safari using a logged-in normal profile with English Netflix UI.

Use:

- `CHROME-VALIDATION.md` for Chrome
- `docs/testing.md` and `docs/safari.md` for Safari

Do not mark manual checks complete without the user's reported result.

## CI

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch.

Ubuntu WebExtension job:

1. Checkout
2. Set up Node from `.nvmrc`
3. `npm ci`
4. `npm test`
5. `npm run build`
6. `npm run assert:webextension`

macOS Safari job:

1. Checkout
2. Set up Node from `.nvmrc`
3. `npm ci`
4. `npm test`
5. `npm run build`
6. `npm run assert:webextension`
7. Print selected Xcode information
8. `npm run safari:build`
9. `npm run assert:safari`

The Safari job uses `github.run_number` as the positive native build number.

Current CI does not independently run `npx tsc --noEmit`. Treat type checking as a required local verification until the authoritative plan is changed to add a CI typecheck gate.

## Release Status

Never hardcode release status in this folder. Read `docs/project-todos.md` for the current state.

The release-ready rule is:

1. All documented unit and fixture tests pass.
2. Universal build and package assertions pass.
3. Unsigned Safari build and package assertions pass.
4. GitHub Actions jobs pass.
5. Authenticated Chrome live checklist passes.
6. Locally signed Safari live checklist passes.
7. Failures and current selector evidence are recorded.
8. The tracker is updated with actual evidence.

## Pre-Commit Checklist

Before committing implementation or release changes:

1. Read `git status` and inspect the complete diff.
2. Preserve unrelated user or agent changes.
3. Run the smallest relevant focused tests during development.
4. Run the documented final verification for the affected scope.
5. Run `git diff --check`.
6. Update authoritative docs when behavior changed.
7. Update this KT folder when topology or operations changed.
8. Update `docs/project-todos.md` with commands and outcomes.

Commit and push only when explicitly requested.
