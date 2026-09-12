# Episode Roulette — Chrome Web Store Assets

Ready-to-upload assets for the Chrome Web Store listing.

## Screenshots (required: exactly 1280×800 or 640×400, JPEG or 24-bit PNG with no alpha)

Upload these two files. The Chrome Web Store dashboard rejects other dimensions, including 1920×1080.

| File | Size | Content |
|---|---|---|
| `screenshot-prime-1280x800.jpg` | 1280×800 JPEG | Prime Video — Smallville series detail with the white **Random Episode** button beside the native Play button |
| `screenshot-netflix-1280x800.jpg` | 1280×800 JPEG | Netflix — JoJo's Bizarre Adventure detail modal with the **Random Episode** button beside the native buttons |

The 1920×1080 PNGs are the original lossless captures and are kept as masters only. To regenerate an upload file from a master: scale it to 1280×720, then centre it on a 1280×800 canvas whose background is a 48 px-blurred 1280×800 cover-crop of the same capture, and export as JPEG (quality 92, no alpha). The blurred backdrop blends the 16:9 content into the 16:10 canvas; cropping the sides instead is not acceptable because the **Random Episode** button sits near the left edge.

## Promo tiles

All three are already the exact required canvas size and are 24-bit PNG without alpha, so they upload as-is.

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
