# Prime Video Manual Validation

## Environment

Authenticated desktop Brave/Chromium, India region, English UI, normal non-Kids profile. Safari Prime is deferred.

## Checklist

- Prime movie does not inject the button.
- Prime series exposes a live-validated placement anchor and the shared owner injects one button there; no placement is assumed from the main play control.
- Single-season and multi-season series discover complete eligible catalogs.
- Season selection changes opaque detail identity and replaces the catalog.
- `COMING SOON`, unavailable, rental, purchase, and unapproved-channel items are excluded.
- Repeated random rolls are independent and repeats are allowed.
- Selected episode is re-resolved uniquely before native click.
- Playback opens the in-page `#dv-web-player` overlay and passes the approved player confirmation predicate.
- URL-preserving playback does not falsely time out.
- Navigation, root replacement, cancellation, and page teardown leave no stale UI or cache writes.
- Netflix automated and live regression checks remain green.

Record browser/version, URL, expected result, actual result, and sanitized console errors. Never record credentials, cookies, tokens, profile identifiers, or media URLs.
