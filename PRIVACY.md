# Episode Roulette — Privacy Policy

Last updated: 14 September 2026

Episode Roulette is a browser extension for Chromium-based desktop browsers that adds a **Random Episode** button to TV series pages on Netflix and Prime Video. It does not collect, store, transmit, or share any personal data.

## What the extension accesses

On a supported series page, the extension reads the season and episode information the site has already rendered in your browser — season names, episode names, and episode numbers — so it can choose one episode at random. That reading happens locally within the page and is never sent anywhere.

The extension requests access to exactly two hosts, `*://*.netflix.com/*` and `*://www.primevideo.com/*`, and no other browser permissions. There is no storage permission, no cookies access, no browsing history, no bookmarks, and no downloads.

## What it does not do

- **No data collection.** Nothing is sent to us or to any server. There is no backend service.
- **No account or login.** It never asks for or stores a Netflix or Prime Video credential.
- **No tracking or analytics.** No cookies, beacons, fingerprinting, or advertising identifiers.
- **No watch history.** It does not record what you watch, what it selects, or what you browse.
- **No third parties.** No third-party code, SDK, analytics, or service is embedded.
- **No selling or sharing of data**, because no data is collected in the first place.

## Install and uninstall links

The extension ships one small background component whose only job is to register two links with the browser:

- On install, it opens the welcome page at <https://episode-roulette.prakashsewani.com/thanks> once, in a new tab.
- On uninstall, Chrome opens a short exit survey at <https://episode-roulette.prakashsewani.com/uninstalled>.

Both pages are optional to visit, and neither receives any data from the extension. The exit survey asks why you removed the extension, and any answers you choose to submit are stored by that website. Nothing the extension read from Netflix or Prime Video is ever attached to them. That background component cannot read page content, cannot access browser storage, and makes no network requests of its own.

## Local, temporary state

Episode catalogs are held in memory for the current tab only and are discarded when the tab closes, the page navigates, or the browser restarts. Nothing is written to disk or to browser storage. Your browser's own sync, history, and site data are untouched.

## Why each permission is needed

| Permission | Purpose |
|---|---|
| `*://*.netflix.com/*` | Show the Random Episode button on Netflix series pages and read the episode list already on the page |
| `*://www.primevideo.com/*` | The same, on Prime Video series pages |

## Children's privacy

The extension collects no data from anyone, including children.

## Changes to this policy

If a future version changes any of the above, this policy will be updated before that version is published.

## Contact

Questions or issues: <https://github.com/PrakashSewani/episode-roulette/issues>
