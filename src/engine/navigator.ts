import { logError, logInfo, logWarning } from '../debug'
import {
  CacheValidationMismatchError,
  type Episode,
  PlaybackResolutionError,
  SeasonControllerError,
  type SeasonDescriptor,
} from '../types'
import { resolveEpisodeRow } from '../netflix/episode-identity'
import {
  activateSeason,
  expandAndValidateSeason,
  resolveLiveEpisodeSelector,
} from '../netflix/season-controller'

const PLAYBACK_TIMEOUT_MS = 10_000

function toSeasonDescriptor(episode: Episode): SeasonDescriptor {
  return {
    key: episode.seasonKey,
    label: episode.seasonLabel,
    seasonNumber: episode.seasonNumber,
    expectedEpisodeCount: episode.discoveredSeasonEpisodeCount,
  }
}

function mapControllerError(error: SeasonControllerError): Error {
  if ([
    'season-missing',
    'strategy-mismatch',
    'active-season-mismatch',
    'count-mismatch',
  ].includes(error.reason)) {
    return new CacheValidationMismatchError(error.message)
  }
  return new PlaybackResolutionError(error.message)
}

export async function playEpisode(
  episode: Episode,
  root: HTMLElement,
  signal: AbortSignal,
  assertCurrent: () => void,
): Promise<void> {
  logInfo('playEpisode start', {
    seasonKey: episode.seasonKey,
    seasonLabel: episode.seasonLabel,
    episodeNumber: episode.episodeNumber,
    episodeIndex: episode.episodeIndex,
    title: episode.title,
    discoveredSeasonEpisodeCount: episode.discoveredSeasonEpisodeCount,
  })
  try {
    const episodeSelector = resolveLiveEpisodeSelector(root)
    if (episodeSelector === null) {
      throw new PlaybackResolutionError('Episode selector could not be resolved uniquely')
    }
    const season = toSeasonDescriptor(episode)
    const deadline = performance.now() + PLAYBACK_TIMEOUT_MS
    logInfo('Playback activating season', { key: season.key, label: season.label })
    const liveEpisodeSelector = await activateSeason(
      root,
      episodeSelector,
      season,
      deadline,
      signal,
    )
    logInfo('Playback expanding season', { key: season.key })
    const rows = await expandAndValidateSeason(
      liveEpisodeSelector,
      season,
      deadline,
      signal,
    )
    logInfo('Playback resolving episode row', {
      liveRowCount: rows.length,
      expectedCount: episode.discoveredSeasonEpisodeCount,
    })
    const row = resolveEpisodeRow(episode, rows)
    if (row === null) {
      logWarning('Episode row resolution failed', {
        title: episode.title,
        episodeNumber: episode.episodeNumber,
        episodeIndex: episode.episodeIndex,
        liveRowCount: rows.length,
      })
      throw new PlaybackResolutionError(
        'Selected episode could not be resolved uniquely',
      )
    }

    if (signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }
    assertCurrent()
    logInfo('Clicking resolved episode row', {
      title: episode.title,
      episodeNumber: episode.episodeNumber,
    })
    row.click()
  } catch (error) {
    if (error instanceof SeasonControllerError) {
      const mapped = mapControllerError(error)
      logError('playEpisode controller failure', {
        reason: error.reason,
        message: error.message,
        mappedName: mapped.name,
      })
      throw mapped
    }
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      logError('playEpisode failed', error)
    }
    throw error
  }
}
