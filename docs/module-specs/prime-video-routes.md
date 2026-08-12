# Prime Video Routes and Root Detection

## Scope

Phase 10 supports authenticated desktop Prime Video in India through `www.primevideo.com` with English UI. Safari Prime is deferred.

## Route identity

A URL with pathname `/detail/<opaque-id>` is a Prime title/season candidate. The opaque ID is provider-local. Referral query parameters do not form identity and must not be used as cache keys. Playback preserves the detail URL and is confirmed by player DOM, not routing.

Unsupported paths and non-Prime hosts do not activate Prime.

## Root detection

The provider searches for a unique connected, visible `[data-testid="DVWebNode-detail-wrapper"]` containing `main[data-testid="detailpage-main"]`. Ambiguous candidates remain unresolved; the provider never selects an arbitrary first candidate.

A series is confirmed only when the scoped root contains at least one `li[data-testid="episode-list-item"]` with a native `a[data-testid="episodes-playbutton"][role="button"]`. A season selector is not required for a single-season series.

## Season navigation

`[data-testid="dp-season-selector"] a[href*="/detail/"]` links to season-specific opaque detail IDs. Authenticated Reacher exposed four numeric season links; navigating from Season 4 to the observed Season 3 detail ID changed the URL, selected Season 3, and replaced the displayed eight-row episode catalog. The provider must wait for the requested detail identity and new catalog before collecting.
