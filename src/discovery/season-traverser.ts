import {
  DiscoveryIncompleteError,
  NoEpisodesError,
  type Episode,
  type SeasonDescriptor,
  type SeriesInfo,
} from '../types'
import { resilientQuery, waitForElement } from '../netflix/dom-utils'
import {
  activateSeason,
  enumerateSeasons,
  expandAndValidateSeason,
} from '../netflix/season-controller'
import { EPISODE_SELECTOR } from '../netflix/selectors'
import { collectEpisodes } from './episode-collector'

const ATTEMPT_TIMEOUT_MS = 5_000

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }
}

async function resolveEpisodeSelector(
  root: HTMLElement,
  deadline: number,
  signal: AbortSignal,
): Promise<HTMLElement> {
  const existing = resilientQuery<HTMLElement>(EPISODE_SELECTOR.selectors, root)
  const selector = existing ?? await waitForElement<HTMLElement>(
    EPISODE_SELECTOR.selectors,
    Math.max(0, deadline - performance.now()),
    root,
    signal,
  )
  if (selector === null) {
    throw new DiscoveryIncompleteError('Episode selector did not render')
  }
  return selector
}

async function initialize(
  root: HTMLElement,
  signal: AbortSignal,
): Promise<SeasonDescriptor[]> {
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    assertNotAborted(signal)
    const deadline = performance.now() + ATTEMPT_TIMEOUT_MS
    try {
      const episodeSelector = await resolveEpisodeSelector(root, deadline, signal)
      return await enumerateSeasons(root, episodeSelector, deadline, signal)
    } catch (error) {
      if (isAbortError(error)) throw error
      lastError = error
    }
  }

  console.error('[Episode Roulette] Season enumeration failed', lastError)
  throw new DiscoveryIncompleteError('Could not enumerate all seasons')
}

async function collectSeason(
  seriesId: string,
  root: HTMLElement,
  season: SeasonDescriptor,
  signal: AbortSignal,
): Promise<Episode[]> {
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    assertNotAborted(signal)
    const deadline = performance.now() + ATTEMPT_TIMEOUT_MS
    try {
      const episodeSelector = await resolveEpisodeSelector(root, deadline, signal)
      if (season.key !== 'implicit') {
        await activateSeason(root, episodeSelector, season, deadline, signal)
      }
      const rows = await expandAndValidateSeason(
        episodeSelector,
        season,
        deadline,
        signal,
      )
      const episodes = collectEpisodes(seriesId, season, rows)
      if (episodes.length === 0) {
        throw new DiscoveryIncompleteError(`No episodes found in ${season.label}`)
      }
      return episodes
    } catch (error) {
      if (isAbortError(error)) throw error
      lastError = error
    }
  }

  console.error(`[Episode Roulette] Season collection failed: ${season.label}`, lastError)
  throw new DiscoveryIncompleteError(`Could not collect ${season.label}`)
}

export async function discoverEpisodes(
  seriesId: string,
  root: HTMLElement,
  signal: AbortSignal,
): Promise<SeriesInfo> {
  assertNotAborted(signal)
  const seasons = await initialize(root, signal)
  const episodes: Episode[] = []

  for (const season of seasons) {
    episodes.push(...await collectSeason(seriesId, root, season, signal))
  }

  assertNotAborted(signal)
  if (episodes.length === 0) {
    throw new NoEpisodesError('No episodes found')
  }

  return {
    id: seriesId,
    totalSeasons: seasons.length,
    episodes,
    discoveredAt: Date.now(),
  }
}
