# Episode Roulette — Chrome Web Store Listing

## Name

Episode Roulette

## Short description (132 characters max)

Play a random episode from any season of a Netflix or Prime Video series with one click.

## Full description

**Tired of deciding what to watch? Let the dice decide.**

Episode Roulette adds a **Random Episode** button to Netflix and Prime Video series pages. With one click it:

- **Discovers every season** of the series (including named seasons like "Phantom Blood")
- **Picks one episode uniformly at random** — every episode has an equal chance
- **Starts native playback** in your browser — no account login, no API, no redirects
- **Starts from the beginning** even for partially watched episodes (Prime Video)

**How it works**

1. Open a series on Netflix or Prime Video (desktop browser, logged in).
2. Click the **Random Episode** button next to the native Play button.
3. The extension scans all seasons, selects one episode at random, and plays it.

**Features**

- Works with multi-season series and named seasons
- Complete-catalog discovery — selection is always uniform across the full series
- Repeats allowed, no watch history, no tracking
- In-memory cache only — nothing is stored between sessions
- Matches the look and feel of each site (Netflix dark theme, Prime white theme)

**Supported sites**

- Netflix (desktop, logged in)
- Prime Video (desktop, logged in)

## Category

Fun

## Permissions justification

| Permission | Why it is needed |
|---|---|
| `*://*.netflix.com/*` | Injects the Random Episode button and reads the episode list on Netflix series pages |
| `*://www.primevideo.com/*` | Injects the Random Episode button and reads the episode list on Prime Video series pages |

The extension requests **no** background service worker, no cookies, no browsing history, no storage of personal data, and no access to any other site. It reads only the series/episode metadata rendered on the page and clicks native play controls on your behalf.

## Privacy policy

Episode Roulette does not collect, store, transmit, or share any personal data.

- **No data collection.** The extension never sends data to any server. All processing happens locally in your browser.
- **No account or login.** It does not ask for or store credentials.
- **No tracking.** It does not use analytics, cookies, beacons, or fingerprinting.
- **No history.** It does not record what you watch, your selections, or your browsing history.
- **In-memory only.** Episode catalogs are cached in memory for the current tab session and cleared when the tab closes or the browser restarts.
- **No third parties.** No third-party code, SDKs, or services are embedded.

Because the extension operates entirely on the page you are already viewing and stores nothing, no privacy policy page is required, but this summary is provided for transparency.

## Support

Report issues or request features at the project repository (GitHub link in the developer section).
