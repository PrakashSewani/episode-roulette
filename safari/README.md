# Safari Wrapper

This directory contains the committed macOS Safari Web Extension wrapper generated with Xcode 26.6 and normalized according to `docs/safari.md`.

Use `npm run safari:sync` to rebuild and mirror the universal WebExtension into ignored `Extension/Resources/`. Use `npm run safari:build` for the unsigned validation build. `npm run safari:init` is a guarded one-time bootstrap command and refuses to overwrite this wrapper.
