import { PENDING_DISCOVERY_KEY, type PendingDiscovery } from './pending'
import {
  DiscoveryIncompleteError,
  NoEpisodesError,
  type Episode,
  type SeriesInfo,
  type TitleContext,
} from '../types'
import { waitForElement } from '../netflix/dom-utils'
import { getPrimeDetailId } from './routes'
import {
  PRIME_EPISODE_ROW,
  PRIME_SEASON_LINK,
} from './selectors'
import { isPrimeRowEligible, parsePrimeEpisodeIdentity } from './identity'

const ATTEMPT_TIMEOUT_MS = 10_000

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
}

function getRows(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(PRIME_EPISODE_ROW)]
}

function getEligibleRows(root: HTMLElement): HTMLElement[] {
  return getRows(root).filter((row) => isPrimeRowEligible(row))
}

async function waitForCatalog(
  root: HTMLElement,
  signal: AbortSignal,
  deadline: number,
): Promise<HTMLElement[]> {
  const rows = await waitForElement<HTMLElement>(
    [PRIME_EPISODE_ROW],
    Math.max(0, deadline - performance.now()),
    root,
    signal,
  )
  if (rows === null) throw new DiscoveryIncompleteError('Prime episode catalog did not render')

  let previous = -1
  let stable = 0
  while (performance.now() < deadline) {
    assertNotAborted(signal)
    const currentRows = getRows(root)
    if (currentRows.length === 0) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
      continue
    }
    const eligible = getEligibleRows(root)
    const unresolved = currentRows.some((row) => !isPrimeRowEligible(row) && !/COMING\s+SOON/iu.test(row.textContent ?? ''))
    // Stabilize on the total row count, not full row text: Prime keeps
    // mutating row internals (hover copies, lazy thumbnails) on long seasons
    // (Smallville 21 rows), so full-text snapshots never match twice. The
    // count still catches progressive rendering (rows appearing over time).
    if (currentRows.length === previous) stable += 1
    else stable = 0
    previous = currentRows.length
    if (stable >= 1 && eligible.length > 0 && !unresolved) return eligible
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
  }
  throw new DiscoveryIncompleteError('Prime episode catalog did not stabilize')
}

function collectEpisodes(
  seriesId: string,
  seasonId: string,
  seasonLabel: string,
  rows: HTMLElement[],
): Episode[] {
  return rows.map((row, index) => {
    const identity = parsePrimeEpisodeIdentity(row, index)
    if (identity === null) {
      throw new DiscoveryIncompleteError('Prime episode identity is incomplete')
    }
    return {
      provider: 'prime-video',
      seriesId,
      seasonKey: `detail:${seasonId}`,
      seasonLabel,
      seasonNumber: Number(seasonLabel.match(/\d+/u)?.[0] ?? '') || null,
      episodeIndex: index,
      episodeNumber: identity.episodeNumber,
      title: identity.title,
      normalizedTitle: identity.normalizedTitle,
      discoveredSeasonEpisodeCount: rows.length,
    }
  })
}

async function collectSeason(
  seriesId: string,
  seasonId: string,
  seasonLabel: string,
  root: HTMLElement,
  signal: AbortSignal,
): Promise<Episode[]> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    assertNotAborted(signal)
    try {
      const rows = await waitForCatalog(root, signal, performance.now() + ATTEMPT_TIMEOUT_MS)
      return collectEpisodes(seriesId, seasonId, seasonLabel, rows)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      lastError = error
    }
  }
  throw new DiscoveryIncompleteError(`Could not collect ${seasonLabel}: ${String(lastError)}`)
}

export async function discoverPrimeEpisodes(
  context: TitleContext,
  root: HTMLElement,
  signal: AbortSignal,
): Promise<SeriesInfo> {
  assertNotAborted(signal)
  const currentId = getPrimeDetailId(context.url)
  if (currentId === null) throw new DiscoveryIncompleteError('Prime detail identity is missing')

  const pending = readPendingDiscovery()
  const seasonLinks = [...root.querySelectorAll<HTMLAnchorElement>(PRIME_SEASON_LINK)]
  const discoveredSeasons = seasonLinks.length > 0
    ? seasonLinks.map((link) => ({
      id: getPrimeDetailId(new URL(link.href, window.location.href).href),
      label: link.textContent?.trim() ?? '',
    })).filter((season): season is { id: string; label: string } => (
      season.id !== null && season.label !== ''
    ))
    : [{ id: currentId, label: 'Episodes' }]
  const seasons = pending?.seriesId === context.titleId
    ? pending.seasons
    : [...new Map(discoveredSeasons.map((season) => [season.id, season])).values()]
  if (seasons.length === 0) throw new DiscoveryIncompleteError('Prime seasons were not discoverable')

  const startIndex = pending?.seriesId === context.titleId ? pending.index : 0
  const episodes = pending?.seriesId === context.titleId ? pending.episodes : []
  if (startIndex >= seasons.length) {
    clearPendingDiscovery()
    return {
      provider: 'prime-video', id: context.titleId, totalSeasons: seasons.length,
      episodes, discoveredAt: Date.now(),
    }
  }

  const season = seasons[startIndex]
  if (season === undefined) throw new DiscoveryIncompleteError('Prime season index is invalid')
    const visibleDetailId = getPrimeDetailId(window.location.href) ?? currentId
    if (visibleDetailId !== season.id) {
    writePendingDiscovery({
      seriesId: context.titleId, seasons, index: startIndex, episodes,
      expiresAt: Date.now() + 60_000,
    })
    const link = [...root.querySelectorAll<HTMLAnchorElement>(PRIME_SEASON_LINK)]
      .find((candidate) => getPrimeDetailId(new URL(candidate.href, window.location.href).href) === season.id)
    if (link === undefined) throw new DiscoveryIncompleteError(`Prime season link missing: ${season.label}`)
    link.click()
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  const collected = await collectSeason(context.titleId, season.id, season.label, root, signal)
  const nextEpisodes = [...episodes, ...collected]
  if (startIndex + 1 < seasons.length) {
    writePendingDiscovery({
      seriesId: context.titleId, seasons, index: startIndex + 1, episodes: nextEpisodes,
      expiresAt: Date.now() + 60_000,
    })
    const nextSeason = seasons[startIndex + 1]
    const nextLink = [...root.querySelectorAll<HTMLAnchorElement>(PRIME_SEASON_LINK)]
      .find((candidate) => getPrimeDetailId(new URL(candidate.href, window.location.href).href) === nextSeason?.id)
    if (nextLink === undefined) throw new DiscoveryIncompleteError('Prime next season link missing')
    nextLink.click()
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  clearPendingDiscovery()
  if (nextEpisodes.length === 0) throw new NoEpisodesError('No eligible Prime episodes found')
  return {
    provider: 'prime-video', id: context.titleId, totalSeasons: seasons.length,
    episodes: nextEpisodes, discoveredAt: Date.now(),
  }
}

function readPendingDiscovery(): PendingDiscovery | null {
  const raw = window.sessionStorage.getItem(PENDING_DISCOVERY_KEY)
  if (raw === null) return null
  try {
    const pending = JSON.parse(raw) as PendingDiscovery
    return pending.expiresAt > Date.now() ? pending : null
  } catch {
    return null
  }
}

function writePendingDiscovery(pending: PendingDiscovery): void {
  window.sessionStorage.setItem(PENDING_DISCOVERY_KEY, JSON.stringify(pending))
}

function clearPendingDiscovery(): void {
  window.sessionStorage.removeItem(PENDING_DISCOVERY_KEY)
}
