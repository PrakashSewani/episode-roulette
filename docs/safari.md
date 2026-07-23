# macOS Safari Packaging

## Scope

Episode Roulette supports macOS Safari through Safari Web Extensions. Chrome and Safari share the same TypeScript content-script source, Netflix selectors, discovery logic, UI, cache behavior, and automated tests.

iOS and iPadOS Safari are outside first-release scope.

---

## Packaging Architecture

One-time bootstrap:

```text
dist/webextension/ -> safari-web-extension-converter -> committed safari/ wrapper
```

Normal build flow:

```text
src/manifest.ts + shared source -> dist/webextension/ -> safari/Extension/Resources/
```

The `safari/` directory contains packaging metadata, Xcode project files, icons, bundle identifiers, signing settings, and generated references to WebExtension resources. It must not contain a second implementation of content-script behavior.

---

## Tooling

Required on macOS:

- Current Xcode
- Safari with Develop features enabled for local debugging
- Apple's `safari-web-extension-converter` command-line tool supplied with Xcode

The converter is invoked once through `npm run safari:init` after `npm run build`. The resulting wrapper is normalized to `safari/EpisodeRoulette.xcodeproj`, scheme `EpisodeRoulette`, and generated resource path `safari/Extension/Resources/`, then committed.

The converter options were verified against Xcode 26.6 build 17F113 on July 23, 2026. Phase 1 uses this non-interactive invocation, where `<temporary-output>` is an empty temporary directory created by `safari:init`:

```bash
xcrun safari-web-extension-converter \
  dist/webextension \
  --project-location <temporary-output> \
  --app-name EpisodeRoulette \
  --bundle-identifier com.episoderoulette.EpisodeRoulette \
  --swift \
  --macos-only \
  --copy-resources \
  --no-open \
  --no-prompt
```

Xcode 26.6 reports the converter executable through `xcrun --find safari-web-extension-converter`; the tool does not expose a standalone version flag. The Xcode build number therefore identifies the verified converter release.

`safari:init` must first verify that `xcrun safari-web-extension-converter` is available and that `safari/` contains no entry other than explicitly approved bootstrap documentation or placeholder files. Any project, source, plist, entitlement, asset, configuration, or unknown entry causes a safe failure. It generates into an approved temporary directory, normalizes and validates the complete wrapper, then moves it into place. It never overwrites or merges into an existing wrapper and removes partial temporary output on failure. The exact converter flags must be recorded in this document when the command is verified against the installed Xcode version during Phase 1; agents must not guess them.

Normal builds never rerun the converter. `npm run safari:sync` first runs the production WebExtension build. Only after it succeeds, synchronization creates a sibling temporary resource mirror and verifies all relative regular-file paths and bytes. It then renames any prior destination to a backup, renames the verified mirror to `safari/Extension/Resources/`, and removes the backup. If promotion fails, it restores the backup before exiting. This is failure-safe replacement, not a claim of uninterrupted atomic directory exchange. The contents of `dist/webextension/` are copied directly, so the destination manifest is `safari/Extension/Resources/manifest.json`, not a nested `webextension/manifest.json`; no destination-only files may remain.

The extension target has a committed `Sync WebExtension Resources` run-script build phase. It treats `safari/Extension/Resources/` as an input directory and copies that directory's contents, including dotfiles, into `${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/` without adding the source directory itself. The resulting resource-relative path is `manifest.json`, not `Resources/manifest.json`. The phase fails when the source directory or manifest is absent, removes stale generated files from the destination resource set, and uses quoted Xcode paths. Hashed files may be added or removed without per-file project references or project edits.

Every app and extension build configuration uses committed `safari/Base.xcconfig`. It contains `#include "GeneratedVersion.xcconfig"` followed by `#include? "LocalSigning.xcconfig"`, so generated version values are required and optional machine-local signing values may override only their own keys. Synchronization reads the product version from `package.json`, verifies the emitted manifest contains it, and writes ignored `safari/GeneratedVersion.xcconfig` with `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`. The latter comes from `EPISODE_ROULETTE_BUILD_NUMBER`, which must be a positive integer and defaults to `1` for local unsigned builds.

Committed `safari/LocalSigning.xcconfig.example` documents these ignored local keys: `DEVELOPMENT_TEAM`, `EPISODE_ROULETTE_APP_BUNDLE_IDENTIFIER`, and `EPISODE_ROULETTE_EXTENSION_BUNDLE_IDENTIFIER`. The app target sets `PRODUCT_BUNDLE_IDENTIFIER = $(EPISODE_ROULETTE_APP_BUNDLE_IDENTIFIER)` and the extension target sets `PRODUCT_BUNDLE_IDENTIFIER = $(EPISODE_ROULETTE_EXTENSION_BUNDLE_IDENTIFIER)`. Local signing must not override `MARKETING_VERSION` or `CURRENT_PROJECT_VERSION`.

Authoritative ownership:

- `src/manifest.ts` owns manifest structure, `src/` owns runtime behavior, and `package.json` is the sole canonical product version source.
- `safari/EpisodeRoulette.xcodeproj` and non-resource files under `safari/` own Apple packaging metadata.
- `safari/Extension/Resources/` is generated, never edited manually, and is not committed. It is reproduced by `npm run safari:sync`.
- `safari/GeneratedVersion.xcconfig` is generated, ignored, and reproduced by `npm run safari:sync`.

---

## Manifest and Permissions

Safari consumes the same mirrored WebExtension manifest and content script as Chrome through the committed Xcode wrapper, subject only to Safari runtime support. Required website access is limited to:

```text
*://*.netflix.com/*
```

No background page or service worker is required. No native messaging, network interception, cookies permission, browsing-history permission, or broad website access is allowed.

Safari users must explicitly enable the extension and grant Netflix website access through Safari Settings. The extension fails passively when permission has not been granted because its content script does not run.

---

## Runtime Compatibility

Shared runtime code may use:

- Standard DOM APIs
- `MutationObserver`
- `AbortController` and `AbortSignal`
- `URL`
- `requestAnimationFrame`
- Standard content-script execution

Core code must not depend on Chrome-only APIs. If a browser API becomes necessary, define a minimal documented browser adapter before using it.

---

## Development Workflow

1. Run `npm run safari:sync`; it performs the production WebExtension build first.
2. Open `safari/EpisodeRoulette.xcodeproj`.
3. Copy committed `safari/LocalSigning.xcconfig.example` to ignored `safari/LocalSigning.xcconfig` and set the local development team and unique app/extension bundle identifiers there.
4. Build and run the containing macOS app.
5. Enable Episode Roulette in Safari Settings > Extensions.
6. Grant access to Netflix.
7. Run the Safari manual smoke checklist from `docs/testing.md`.

Signing team IDs, developer certificates, provisioning profiles, local bundle identifiers, and account credentials are machine-specific and must not be committed. The canonical project uses only the ignored local xcconfig for these overrides and remains directly buildable with signing disabled in CI.

---

## Verification

The Safari build is acceptable when:

- Xcode builds the containing app and extension without errors
- The extension can be enabled in current macOS Safari
- Website access is limited to Netflix
- The shared content script loads on Netflix
- Movie/series detection matches Chrome behavior
- Custom-dropdown traversal and expansion work
- Random playback reaches `/watch/`
- Navigation cancellation, error retry, and cache behavior match Chrome
- No Safari-specific product-logic fork exists

Automated macOS validation runs:

```bash
xcodebuild \
  -project safari/EpisodeRoulette.xcodeproj \
  -scheme EpisodeRoulette \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Signed local execution and Netflix smoke testing remain manual release gates because signing teams and authenticated Netflix sessions are machine-specific.

Automated authenticated Netflix E2E is not required. Unit and fixture integration tests validate shared behavior; live Safari testing validates packaging and current Netflix DOM compatibility.
