# Prime Video Episode Identity

## Durable identity

A Prime episode record must include provider identity, series/season detail identity, season label or number when available, episode number when available, normalized title, and the complete eligible count observed for that season. It must not include DOM nodes, blob media URLs, referral query strings, or session data.

## Observed sources

Episode rows expose accessible labels such as `Play S2 E1` and titles in the row. The provider should prefer a stable episode number plus normalized title. If either source is missing or conflicting, the row is not safely resolvable until an approved fallback is documented.

## Live matching

After selection, the provider re-resolves the selected season and queries current episode rows. It clicks only one uniquely matching native `episodes-playbutton`. Missing, conflicting, or ambiguous matches fail without clicking another row.
