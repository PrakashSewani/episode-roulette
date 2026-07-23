import type { Episode, EpisodeRowIdentity } from '../types'
import { resilientQuery } from './dom-utils'
import { EPISODE_NUMBER, EPISODE_TITLE } from './selectors'

function normalizeWhitespace(text: string): string {
  return text.normalize('NFKC').trim().replace(/\s+/gu, ' ')
}

export function normalizeEpisodeTitle(text: string): string {
  return normalizeWhitespace(text).toLocaleLowerCase('en-US')
}

function usableNormalizedTitle(title: string): string | null {
  const normalized = normalizeEpisodeTitle(title)
  return normalized !== '' && normalized !== 'unknown episode' ? normalized : null
}

function parseEpisodeNumber(text: string): number | null {
  const match = normalizeWhitespace(text).match(
    /^(?:(?:e|ep\.?|episode)\s*)?(\d+)$/iu,
  )
  const value = match?.[1] === undefined ? Number.NaN : Number(match[1])
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

export function parseEpisodeRowIdentity(
  row: HTMLElement,
  episodeIndex: number,
): EpisodeRowIdentity {
  const ariaLabel = normalizeWhitespace(row.getAttribute('aria-label') ?? '')
  const selectedTitle = ariaLabel || normalizeWhitespace(
    resilientQuery(EPISODE_TITLE.selectors, row)?.textContent ?? '',
  )
  const title = selectedTitle || 'Unknown Episode'
  const numberElements = new Set<Element>()

  for (const selector of EPISODE_NUMBER.selectors) {
    for (const match of row.querySelectorAll(selector)) {
      numberElements.add(match)
    }
  }

  const parsedNumbers = [...numberElements]
    .map((element) => parseEpisodeNumber(element.textContent ?? ''))
    .filter((value): value is number => value !== null)
  const distinctNumbers = new Set(parsedNumbers)

  return {
    title,
    normalizedTitle: usableNormalizedTitle(title),
    episodeNumber: distinctNumbers.size === 1 ? parsedNumbers[0] ?? null : null,
    episodeNumberConflict: distinctNumbers.size > 1,
    episodeIndex,
  }
}

export function resolveEpisodeRow(
  episode: Episode,
  rows: HTMLElement[],
): HTMLElement | null {
  const identities = rows.map((row, index) => parseEpisodeRowIdentity(row, index))
  const normalizedTitle = usableNormalizedTitle(episode.title)

  if (episode.episodeNumber !== null && normalizedTitle !== null) {
    const matches = identities.flatMap((identity, index) => (
      !identity.episodeNumberConflict
      && identity.episodeNumber === episode.episodeNumber
      && identity.normalizedTitle === normalizedTitle
        ? [rows[index]!]
        : []
    ))
    if (matches.length === 1) return matches[0]!
    if (matches.length > 1) return null
  }

  if (normalizedTitle !== null) {
    const matches = identities.flatMap((identity, index) => (
      identity.normalizedTitle === normalizedTitle ? [rows[index]!] : []
    ))
    if (matches.length === 1) return matches[0]!
    if (matches.length > 1) return null
  }

  if (
    normalizedTitle === null
    && rows.length === episode.discoveredSeasonEpisodeCount
  ) {
    const identity = identities[episode.episodeIndex]
    return identity !== undefined && !identity.episodeNumberConflict
      ? rows[episode.episodeIndex] ?? null
      : null
  }

  return null
}
