import type { Episode } from '../types'
import { PRIME_EPISODE_PLAY } from './selectors'

function normalize(text: string): string {
  return text.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
}

function parseEpisodeNumber(label: string): number | null {
  const match = label.match(/\bS\d+\s+E(\d+)\b/iu)
  const value = match?.[1] === undefined ? Number.NaN : Number(match[1])
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

export function isPrimeRowEligible(row: HTMLElement): boolean {
  if (row.querySelector(PRIME_EPISODE_PLAY) === null) return false
  return !/coming\s+soon|unavailable|rent|purchase|subscribe|join\s+prime/iu.test(
    row.textContent ?? '',
  )
}

export function parsePrimeEpisodeIdentity(
  row: HTMLElement,
  index: number,
): { episodeNumber: number | null; title: string; normalizedTitle: string | null; index: number } | null {
  if (!isPrimeRowEligible(row)) return null
  const play = row.querySelector<HTMLElement>(PRIME_EPISODE_PLAY)
  const label = play?.getAttribute('aria-label') ?? ''
  const heading = row.querySelector('h1, h2, h3, h4, [data-testid="episode-title"]')?.textContent?.trim()
  const title = (heading || label.replace(/^Play\s+S\d+\s+E\d+\s*/iu, '').trim())
    .replace(/^\d+\.\s*/u, '')
    .trim()
  const normalizedTitle = normalize(title)
  const episodeNumber = parseEpisodeNumber(label)
  if (episodeNumber === null || normalizedTitle === '') return null
  return { episodeNumber, title, normalizedTitle, index }
}

export function resolvePrimeEpisodeRow(
  episode: Episode,
  rows: HTMLElement[],
): HTMLElement | null {
  const matches = rows.filter((row, index) => {
    const identity = parsePrimeEpisodeIdentity(row, index)
    return identity !== null
      && identity.episodeNumber === episode.episodeNumber
      && identity.normalizedTitle === episode.normalizedTitle
  })
  return matches.length === 1 ? matches[0] ?? null : null
}
