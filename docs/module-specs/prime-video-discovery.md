# Prime Video Discovery

## Goal

Return every eligible episode across the supported Prime series seasons or fail atomically.

## Rules

1. Enumerate season links within `[data-testid="dp-season-selector"]`.
2. Navigate through Prime season detail URLs and wait for catalog replacement.
3. Collect only `li[data-testid="episode-list-item"]` rows with `a[data-testid="episodes-playbutton"]`.
4. Exclude rows marked `COMING SOON`, unavailable, rental-only, purchase-only, or requiring an unapproved channel.
5. Treat missing eligibility evidence as a discovery failure, not as playable content.
6. Wait for lazy rendering and stabilize episode identity before accepting a season.
7. Retry a failed season once after re-querying controls.
8. Discard all partial results if any season remains incomplete.

Prime discovery owns no cache. The orchestrator caches only the complete returned `SeriesInfo` under a provider-qualified key.

## Validation gates

The lazy-load/scroll behavior, timeout budgets, and eligibility markers are verified in fixtures and authenticated Brave (2026-08-15 full four-season Reacher roll; user confirmed Netflix + Prime behavior in Brave 2026-08-16).
