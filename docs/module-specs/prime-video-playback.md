# Prime Video Playback

## Native action

Playback is initiated only through the current episode row's `a[data-testid="episodes-playbutton"][role="button"]`. The provider must perform a final current-generation and abort check immediately before the synchronous native click.

## Confirmation

Prime preserves the detail URL after an episode click. The provider must not use a route predicate. It waits for `#dv-web-player` / `div[aria-label="Web Player"]`, matching `.atvwebplayersdk-episode-info` or title metadata, and completion of `.atvwebplayersdk-loading-overlay[role="status"]`. The exact ready-state predicate requires live authenticated validation.

Session-specific `<video>` blob sources are never retained or used for identity.

When native playback causes a full Prime detail-document navigation, the provider may retain only a short-lived pending-playback marker containing the current opaque detail ID, episode number, normalized title, and expiry. It is cleared after confirmation, timeout, or when the current detail ID no longer matches; it is not a catalog, history, or session-media record.

## Observed authenticated Brave result — 2026-08-12

A native `Play S4 E1` click preserved the detail URL and opened `#dv-web-player` with matching `S4 E1 City of Brotherly Love` metadata. After approximately 9.7 seconds, `.atvwebplayersdk-loading-overlay[role="status"]` still reported `Loading` and the player video reported `readyState: 0`. Phase 10 implements the approved initial predicate as player root plus matching metadata plus loading-overlay removal; player-open and metadata presence remain intermediate state.

## Restart

Start-over behavior is out of scope for Phase 10. Do not reuse Netflix timeline selectors or assign `video.currentTime` without a separate approved Prime observation and specification.
