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
- Native episode playback opens the documented player root and matching metadata. Phase 10 confirmation requires the player root, matching metadata, and removal of `.atvwebplayersdk-loading-overlay[role="status"]`; the observed Brave session remained loading, so live completion remains a release gate.

## Unknowns requiring validation

Timeline/start-over controls, lazy-load controls, rental/channel markers, alternate Prime layouts, and live completion of the player-ready predicate remain validation gates. The Phase 10 implementation must fail closed when eligibility or player readiness cannot be established; it must not reuse Netflix timeline behavior.
