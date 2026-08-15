# Episode Roulette — Chrome Web Store Assets

Ready-to-upload assets for the Chrome Web Store listing.

## Screenshots (1280×720 or 1920×1080 recommended)

| File | Size | Content |
|---|---|---|
| `screenshot-prime-1920x1080.png` | 1920×1080 | Prime Video — Smallville series detail with the white **Random Episode** button beside the native Play button |
| `screenshot-netflix-1920x1080.png` | 1920×1080 | Netflix — JoJo's Bizarre Adventure detail modal with the **Random Episode** button beside the native buttons |

## Promo tiles

| File | Size | CWS requirement |
|---|---|---|
| `promo-small-440x280.png` | 440×280 | Small promotional tile |
| `promo-large-920x680.png` | 920×680 | Large promotional tile |
| `marquee-1400x560.png` | 1400×560 | Marquee promotional image |

## Source captures

The screenshots were captured from the live authenticated session on 2026-08-15:

- Prime Video Smallville detail page (`/detail/0U5NMQZ9QSO0LL5SYMP1VWKB43`) — hero art plus button.
- Netflix JoJo's Bizarre Adventure detail modal (`/title/80179831`) — hero art plus button.

**Why the captures show detail pages, not the player:** Netflix and Prime Video stream with Widevine/HDCP DRM, so any capture of the in-player video renders black (hardware-accelerated protected frames are withheld from compositing). Detail-page hero art is a normal CSS image, not the DRM stream, so it captures cleanly. Do not attempt to capture the playing video for store assets.

## Store listing copy

- `store-listing.md` — description, privacy policy, and permissions justification text ready to paste into the CWS dashboard.
