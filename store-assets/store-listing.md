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

## Single purpose (Privacy practices tab)

The Chrome Web Store requires one sentence describing the extension's single purpose. Paste this:

> Episode Roulette plays a randomly selected episode from a streaming series. On a supported series page it adds one button, reads the season and episode list the site has already rendered, picks one episode uniformly at random, and clicks that episode's native play control. Randomly choosing and starting an episode is the only thing the extension does.

## Permissions justification

| Permission | Why it is needed |
|---|---|
| `*://*.netflix.com/*` | Injects the Random Episode button and reads the episode list on Netflix series pages |
| `*://www.primevideo.com/*` | Injects the Random Episode button and reads the episode list on Prime Video series pages |

### Justification text (Privacy practices tab)

Paste the matching block into each host permission's justification field:

**`*://*.netflix.com/*`**

> The content script must run on Netflix series pages to place the Random Episode button beside Netflix's own Play button and to read the season and episode list that Netflix has already rendered on the page. Choosing an episode at random requires reading that list, and starting playback requires clicking the chosen episode's own row on the user's behalf. Nothing runs in the background and no data leaves the browser.

**`*://www.primevideo.com/*`**

> The content script must run on Prime Video series pages to place the Random Episode button beside the native Play button, read the season and episode list Prime Video has already rendered so one episode can be chosen uniformly at random, and click the chosen episode's native play control. Nothing runs in the background and no data leaves the browser.

## Remote code

The Privacy practices tab asks whether the extension uses remote code. It does not. Paste this:

> This extension does not use remote code. All JavaScript and CSS are bundled into the published package at build time. There are no external script tags, no CDN imports, no eval(), no new Function(), and no dynamically fetched or remotely executed code. The extension makes no network requests of its own. The only external URL in the package is a GitHub Sponsors hyperlink in the toolbar popup, which the user may click to open in a new tab; it loads nothing into the extension.

The extension requests **no** background service worker, no cookies, no browsing history, no storage of personal data, and no access to any other site. It reads only the series/episode metadata rendered on the page and clicks native play controls on your behalf.

## Privacy policy

Paste-ready text for the Chrome Web Store privacy policy URL field, a hosted `/privacy` page, or a reviewer request. It covers both supported providers.

**Episode Roulette — Privacy Policy**

Last updated: 12 September 2026

Episode Roulette is a browser extension for Chromium-based desktop browsers that adds a **Random Episode** button to TV series pages on Netflix and Prime Video. It does not collect, store, transmit, or share any personal data.

**What the extension accesses**

On a supported series page, the extension reads the season and episode information the site has already rendered in your browser — season names, episode names, and episode numbers — so it can choose one episode at random. That reading happens locally within the page and is never sent anywhere.

The extension requests access to exactly two hosts, `*://*.netflix.com/*` and `*://www.primevideo.com/*`, and no other browser permissions. There is no storage permission, no cookies access, no browsing history, no bookmarks, no downloads, and no background service worker.

**What it does not do**

- **No data collection.** Nothing is sent to us or to any server. There is no backend service.
- **No account or login.** It never asks for or stores a Netflix or Prime Video credential.
- **No tracking or analytics.** No cookies, beacons, fingerprinting, or advertising identifiers.
- **No watch history.** It does not record what you watch, what it selects, or what you browse.
- **No third parties.** No third-party code, SDK, analytics, or service is embedded.
- **No selling or sharing of data**, because no data is collected in the first place.

**Local, temporary state**

Episode catalogs are held in memory for the current tab only and are discarded when the tab closes, the page navigates, or the browser restarts. Nothing is written to disk or to browser storage. Your browser's own sync, history, and site data are untouched.

**Why each permission is needed**

| Permission | Purpose |
|---|---|
| `*://*.netflix.com/*` | Show the Random Episode button on Netflix series pages and read the episode list already on the page |
| `*://www.primevideo.com/*` | The same, on Prime Video series pages |

**Children's privacy**

The extension collects no data from anyone, including children.

**Changes to this policy**

If a future version changes any of the above, this policy will be updated before that version is published.

**Contact**

Questions or issues: https://github.com/prakashsewani/episode-roulette/issues

Because the extension operates entirely on the page you are already viewing and stores nothing, no privacy policy page is strictly required, but this text is provided for transparency and for the store's policy URL field.

## Support

Report issues or request features at the project repository (GitHub link in the developer section).
