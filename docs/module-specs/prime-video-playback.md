# Prime Video Playback

## Native action

Playback is initiated only through the current episode row's `a[data-testid="episodes-playbutton"][role="button"]`. The provider must perform a final current-generation and abort check immediately before the synchronous native click.

## Confirmation

Prime preserves the detail URL after an episode click. The provider must not use a route predicate. It waits for `#dv-web-player` / `div[aria-label="Web Player"]`, matching `.atvwebplayersdk-episode-info` or title metadata, and a player `<video>` element with `readyState >= 3` (data available) and not `ended`. The loading overlay must not be used as a readiness signal: live observation proves it is a permanent structural element that never removes.

Session-specific `<video>` blob sources are never retained or used for identity.

When native playback causes a full Prime detail-document navigation, the provider may retain only a short-lived pending-playback marker containing the current opaque detail ID, episode number, normalized title, and expiry. It is cleared after confirmation, timeout, or when the current detail ID no longer matches; it is not a catalog, history, or session-media record.

## Observed authenticated Brave results

### 2026-08-12

A native `Play S4 E1` click preserved the detail URL and opened `#dv-web-player` with matching `S4 E1 City of Brotherly Love` metadata. After approximately 9.7 seconds, `.atvwebplayersdk-loading-overlay[role="status"]` still reported `Loading` and the player video reported `readyState: 0`.

### 2026-08-15

Re-run on the same authenticated India/Brave profile, Reacher Season 1–4 detail pages.

- The loading overlay is a **permanent structural element**: `<div class="atvwebplayersdk-loading-overlay fbukmfr f8hspre" role="status" aria-live="polite"><span class="f1grbl39"></span></div>`, empty text, `pointer-events: none`. It is present before, during, and after playback; it never removes and must not gate confirmation.
- Manual native clicks on episode-row play controls (`Play S3 E1`, `Play S2 E1`, `Play S2 E5`) each opened the player with matching episode metadata and started the **episode video** directly (`readyState: 4`, advancing `currentTime`, durations 2583–3341 s).
- Two extension rolls (S3 E1 and S2 E5) opened the player with the same metadata but played the **trailer** video (30–122 s) with the real episode loaded (`readyState: 4`) and paused at 0 — the player was already open from the season-navigation transition, and Prime interpreted the episode-row click as a trailer preview into the open player.
- Closing the player and clicking the same row play control plays the episode directly. The fix: the provider must close any open `#dv-web-player` (via its close control) immediately before the synchronous episode-row click.
- The player auto-reopens in this environment (sticky session playback state) after closing; a clean closed-player state is not reliably reachable in this session, so the close-before-click behavior must be verified in a session where the player is not auto-resuming.
- 2026-08-15 re-validation after the video-ready predicate and close-before-click fix: the video-ready predicate is sound (a `<video>` reaches `readyState: 4` during playback), but the close-before-click fix could not be validated because this authenticated session has a permanently-open player whose close control has no effect (clicking it leaves `#dv-web-player` present, in both the original and fresh tabs, and Prime treats every episode-row click as a trailer preview into the open player). A session with a dismissible player is required to confirm the fix; until then the trailer-preview behavior is environment-confounded and remains an open release gate.
- 2026-08-15 final live validation (same session): full end-to-end roll **succeeded**. Discovery traversed all four Reacher seasons (each season navigation auto-plays the season trailer in the hidden `display:none` player shell — a Prime behavior, not a stuck player), then the selected episode `S4 E2 Cage Fight` played at `readyState: 4` with advancing `currentTime` (t:83 → t:116 over ~8 s, duration 2935 s). Confirmation completed with the button remaining in loading/disabled state through playback. The full roll takes ~40–60 s because discovery visits all seasons and each season navigation restarts the hidden trailer autoplay, which the provider must pause before the episode-row click.
- Fixes validated by this run: (1) the confirmation predicate requires the long episode video (>300 s) to be playing (`!paused`, `readyState >= 3`, not `ended`) — the short trailer never confirms; (2) `closeOpenPlayer` closes a visible player and waits for dismissal, then pauses any playing video in the hidden player shell so the row click starts the episode rather than continuing the trailer; (3) the pending playback marker survives season navigation (TTL raised to 60 s, no detail-ID-mismatch clearing, transient non-detail routes resolve through the pending marker); (4) a pending playback is resumed, never re-randomized, after navigation.

## Native action

Playback is initiated only through the current episode row's `a[data-testid="episodes-playbutton"][role="button"]`. The provider must perform a final current-generation and abort check immediately before the synchronous native click. It must also close any open `#dv-web-player` immediately before that click so Prime starts the episode rather than a trailer preview.

## Restart

Prime partially-watched episodes resume at saved server-side offsets: episode rows show `Resume Sx Ey` labels and the play-control href carries `?t=<offset>`, but Prime ignores `t=0`/removed-`t` variants and starts at the saved position regardless (live-verified 2026-08-15: `t=131` and `t=0` both started S3 E4 at its resume position).

Live observation found **no DOM seek bar, timeline slider, or time display** in the current player build: no `role="slider"`/`progressbar`, no `aria-valuenow`, no wide-thin seek-bar element, no `atvwebplayersdk` timeline classes, and no visible time text even with controls revealed. The only slider is the Volume `input[type="range"]`. Player controls (Pause, Skip ±10 s, Next Episode) appear only under trusted pointer activity and are not reliably scriptable.

**Approved Prime restart mechanism**: assign `video.currentTime = 0` on the playing episode `<video>` (duration > 300 s, `readyState >= 3`, not paused) after playback confirmation. Live-verified 2026-08-15: setting `currentTime = 0` on the playing S3 E4 video snapped to 0 and playback continued from t:0 → t:1 while still playing. This is Prime-specific; the Netflix `M7375` restriction on `currentTime` does not apply to Prime (verified). Never reuse Netflix timeline selectors on Prime.

The restart is armed only for provider `prime-video` after a successful native episode click; it must run after confirmation, be abortable, and skip when the episode already starts at/near 0.
