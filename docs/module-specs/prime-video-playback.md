# Prime Video Playback

## Native action

Playback is initiated only through the current episode row's `a[data-testid="episodes-playbutton"][role="button"]`. The provider must perform a final current-generation and abort check immediately before the synchronous native click.

## Confirmation

Prime preserves the detail URL after an episode click. The provider must not use a route predicate. It waits for `#dv-web-player` / `div[aria-label="Web Player"]`, matching `.atvwebplayersdk-episode-info` or title metadata, and completion of `.atvwebplayersdk-loading-overlay[role="status"]`. The exact ready-state predicate requires live authenticated validation.

Session-specific `<video>` blob sources are never retained or used for identity.

## Restart

Start-over behavior is out of scope for Phase 10. Do not reuse Netflix timeline selectors or assign `video.currentTime` without a separate approved Prime observation and specification.
