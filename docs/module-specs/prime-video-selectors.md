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

## Authenticated Brave observations — 2026-08-12

- Season 4 exposed eight `li[data-testid="episode-list-item"]` rows.
- Rows 1–3 exposed native `a[data-testid="episodes-playbutton"][role="button"]` controls with labels `Play S4 E1` through `Play S4 E3`.
- Rows 4–8 exposed `COMING SOON` markers and no native episode play control.
- The main play control is `a[data-testid="dp-atf-play-button"][role="button"]` inside `div.dv-dp-node-playback`. Phase 10 uses that provider-owned action container as the shared button placement anchor; the extension button is inserted after the main play action and does not invoke the main action.
- Native episode playback opens the documented player root and matching metadata. Confirmation is implemented with the video-ready predicate: the player root plus matching `.atvwebplayersdk-episode-info` plus a long playing episode `<video>` (`readyState >= 3`, not ended, duration > 300 s). The permanent loading overlay never gates confirmation. Live-validated 2026-08-15 (full roll played `S4 E2 Cage Fight` at `readyState: 4`).

## Unknowns requiring validation

Lazy-load controls, rental/channel markers, and alternate Prime layouts remain open for future observation. The implemented discovery and player-readiness predicates are live-validated (2026-08-15) and fail closed when eligibility or player readiness cannot be established; the Prime implementation must not reuse Netflix timeline behavior.
