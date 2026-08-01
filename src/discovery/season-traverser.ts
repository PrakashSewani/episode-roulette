import { logError, logInfo, logWarning } from '../debug'
import {
  DiscoveryIncompleteError,
  NoEpisodesError,
  type Episode,
  type SeasonDescriptor,
  type SeriesInfo,
} from '../types'
import { waitForElement } from '../netflix/dom-utils'
import {
  activateSeason,
  enumerateSeasons,
  expandAndValidateSeason,
} from '../netflix/season-controller'
import { EPISODE_SELECTOR } from '../netflix/selectors'
import { collectEpisodes } from './episode-collector'

const ATTEMPT_TIMEOUT_MS = 10_000

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
  const selector = await waitForElement<HTMLElement>(
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
    logInfo('Season enumeration attempt', { attempt: attempt + 1 })
    try {
      const episodeSelector = await resolveEpisodeSelector(root, deadline, signal)
      const seasons = await enumerateSeasons(root, episodeSelector, deadline, signal)
      logInfo('Seasons enumerated', {
        count: seasons.length,
        seasons: seasons.map((season) => ({
          key: season.key,
          label: season.label,
          seasonNumber: season.seasonNumber,
          expectedEpisodeCount: season.expectedEpisodeCount,
        })),
      })
      return seasons
    } catch (error) {
      if (isAbortError(error)) throw error
      lastError = error
      logWarning('Season enumeration attempt failed', {
        attempt: attempt + 1,
        error,
      })
    }
  }

  logError('Season enumeration failed after retry', lastError)
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
    logInfo('Collect season attempt', {
      attempt: attempt + 1,
      key: season.key,
      label: season.label,
      expectedEpisodeCount: season.expectedEpisodeCount,
    })
    try {
      const episodeSelector = await resolveEpisodeSelector(root, deadline, signal)
      let liveEpisodeSelector = episodeSelector
      if (season.key !== 'implicit') {
        logInfo('Activating season', { key: season.key, label: season.label })
        liveEpisodeSelector = await activateSeason(
          root,
          episodeSelector,
          season,
          deadline,
          signal,
        )
        logInfo('Season activated', { key: season.key })
      }
      logInfo('Expanding and validating season', { key: season.key })
      const rows = await expandAndValidateSeason(
        liveEpisodeSelector,
        season,
        deadline,
        signal,
      )
      logInfo('Season rows validated', {
        key: season.key,
        rowCount: rows.length,
      })
      const episodes = collectEpisodes(seriesId, season, rows)
      if (episodes.length === 0) {
        throw new DiscoveryIncompleteError(`No episodes found in ${season.label}`)
      }
      logInfo('Season collected', {
        key: season.key,
        episodeCount: episodes.length,
        titles: episodes.slice(0, 5).map((episode) => episode.title),
      })
      return episodes
    } catch (error) {
      if (isAbortError(error)) throw error
      lastError = error
      logWarning('Season collection attempt failed', {
        attempt: attempt + 1,
        key: season.key,
        label: season.label,
        error,
      })
    }
  }

  logError(`Season collection failed: ${season.label}`, lastError)
  throw new DiscoveryIncompleteError(`Could not collect ${season.label}`)
}

export async function discoverEpisodes(
  seriesId: string,
  root: HTMLElement,
  signal: AbortSignal,
): Promise<SeriesInfo> {
  assertNotAborted(signal)
  logInfo('discoverEpisodes start', { seriesId })
  const seasons = await initialize(root, signal)
  const episodes: Episode[] = []

  for (const season of seasons) {
    episodes.push(...await collectSeason(seriesId, root, season, signal))
  }

  assertNotAborted(signal)
  if (episodes.length === 0) {
    throw new NoEpisodesError('No episodes found')
  }

  logInfo('discoverEpisodes complete', {
    seriesId,
    totalSeasons: seasons.length,
    episodeCount: episodes.length,
  })
  return {
    id: seriesId,
    totalSeasons: seasons.length,
    episodes,
    discoveredAt: Date.now(),
  }
}
