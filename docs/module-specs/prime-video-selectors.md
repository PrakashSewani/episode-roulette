# Prime Video Selectors

## Source

Selectors are based on sanitized authenticated India/Brave/English Reacher captures recorded in `docs/selectors-reference.md` on 2026-08-12. `data-testid` hooks have priority over classes and text.

## Approved observations

- Root: `[data-testid="DVWebNode-detail-wrapper"]`
- Main root: `main[data-testid="detailpage-main"]`
- Season selector: `[data-testid="dp-season-selector"]`
- Episodes tab: `button[data-testid="btf-episodes-tab"][role="tab"]`
- Episode row: `li[data-testid="episode-list-item"]`
- Native episode action: `a[data-testid="episodes-playbutton"][role="button"]`
- Runtime: `[data-testid="episode-runtime"]`
- Release date: `[data-testid="episode-release-date"]`
- Player: `#dv-web-player`, `div[aria-label="Web Player"]`
- Loading state: `.atvwebplayersdk-loading-overlay[role="status"]`
- Player title: `.atvwebplayersdk-title-text`
- Player episode metadata: `.atvwebplayersdk-episode-info`

Session-specific `blob:` media URLs and private profile attributes are never selectors or durable data.

## Unknowns requiring validation

Button placement anchor, timeline/start-over controls, lazy-load controls, rental/channel markers, and alternate Prime layouts require additional evidence before selectors or placement behavior are added. The shared button owner must not invent Prime placement from the main play control or another unverified action.
