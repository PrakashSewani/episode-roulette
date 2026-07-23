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
} from '../netflix/season-controller'
import { EPISODE_SELECTOR } from '../netflix/selectors'

const PLAYBACK_TIMEOUT_MS = 10_000

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  return [...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0)
    && style.display !== 'none'
    && style.visibility !== 'hidden'
}

function requireEpisodeSelector(root: HTMLElement): HTMLElement {
  const candidates = new Set<HTMLElement>()
  for (const selector of EPISODE_SELECTOR.selectors) {
    for (const match of root.querySelectorAll<HTMLElement>(selector)) {
      candidates.add(match)
    }
  }
  const valid = [...candidates].filter((element) => element.isConnected && isVisible(element))
  if (valid.length !== 1) {
    throw new PlaybackResolutionError('Episode selector could not be resolved uniquely')
  }
  return valid[0]!
}

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
  try {
    const episodeSelector = requireEpisodeSelector(root)
    const season = toSeasonDescriptor(episode)
    const deadline = performance.now() + PLAYBACK_TIMEOUT_MS
    const liveEpisodeSelector = await activateSeason(
      root,
      episodeSelector,
      season,
      deadline,
      signal,
    )
    const rows = await expandAndValidateSeason(
      liveEpisodeSelector,
      season,
      deadline,
      signal,
    )
    const row = resolveEpisodeRow(episode, rows)
    if (row === null) {
      throw new PlaybackResolutionError(
        'Selected episode could not be resolved uniquely',
      )
    }

    if (signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }
    assertCurrent()
    row.click()
  } catch (error) {
    if (error instanceof SeasonControllerError) {
      throw mapControllerError(error)
    }
    throw error
  }
}
