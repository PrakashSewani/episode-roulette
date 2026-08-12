import type {
  ButtonPlacement,
  DetectionResult,
  Episode,
  PageChangeCallback,
  ProviderRuntime,
  SeriesInfo,
  TitleContext,
} from '../types'
import { waitForElement } from '../netflix/dom-utils'
import { discoverPrimeEpisodes } from '../prime/discovery'
import { isPrimeRowEligible, resolvePrimeEpisodeRow } from '../prime/identity'
import { getPrimeDetailId, getPrimeTitleContext, PRIME_HOST } from '../prime/routes'
import {
  PRIME_DETAIL_ROOT,
  PRIME_EPISODE_PLAY,
  PRIME_EPISODE_ROW,
  PRIME_LOADING,
  PRIME_MAIN_PLAY,
  PRIME_MAIN_ROOT,
  PRIME_PLAYER,
  PRIME_PLAYER_EPISODE_INFO,
  PRIME_PLAYER_SURFACE,
  PRIME_PLAYER_TIMING,
  PRIME_PLAYER_TITLE,
} from '../prime/selectors'
import {
  clearObservation,
  observeForTitleRoot,
  observeTitleRoot,
  start as startObserver,
  stop as stopObserver,
} from '../prime/observer'
import { PlaybackResolutionError } from '../types'
import {
  PENDING_DISCOVERY_KEY,
  PENDING_PLAYBACK_KEY,
  type PendingPlayback,
} from '../prime/pending'

const PLAYBACK_TIMEOUT_MS = 15_000

const knownDetailIds = new Set<string>()

let playbackWaiter: {
  episode: Episode
  timer: number
  signal: AbortSignal
  resolve: () => void
  reject: (error: Error) => void
  abort: () => void
} | null = null

function visible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  return element.isConnected
    && style.display !== 'none'
    && style.visibility !== 'hidden'
}

function resolveRoot(): HTMLElement | null {
  const roots = [...document.querySelectorAll<HTMLElement>(PRIME_DETAIL_ROOT)].filter((root) => (
    visible(root) && root.querySelector(PRIME_MAIN_ROOT) !== null
  ))
  return roots.length === 1 ? roots[0] ?? null : null
}

function clearPlayback(error?: Error): void {
  const waiter = playbackWaiter
  if (waiter === null) return
  playbackWaiter = null
  window.clearTimeout(waiter.timer)
  clearPendingPlayback()
  waiter.signal.removeEventListener('abort', waiter.abort)
  if (error === undefined) waiter.resolve()
  else waiter.reject(error)
}

function currentPrimeContext(): TitleContext | null {
  return getPrimeTitleContext(window.location.href)
}

function readPendingPlayback(): PendingPlayback | null {
  const raw = window.sessionStorage.getItem(PENDING_PLAYBACK_KEY)
  if (raw === null) return null
  try {
    const pending = JSON.parse(raw) as PendingPlayback
    const detailId = getPrimeDetailId(window.location.href) ?? pending.detailId
    if (pending.detailId !== detailId || pending.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(PENDING_PLAYBACK_KEY)
      return null
    }
    return pending
  } catch {
    window.sessionStorage.removeItem(PENDING_PLAYBACK_KEY)
    return null
  }
}

function writePendingPlayback(episode: Episode, detailId: string): void {
  window.sessionStorage.setItem(PENDING_PLAYBACK_KEY, JSON.stringify({
    seriesId: episode.seriesId,
    detailId,
    episode,
    expiresAt: Date.now() + PLAYBACK_TIMEOUT_MS,
  } satisfies PendingPlayback))
}

function clearPendingPlayback(): void {
  window.sessionStorage.removeItem(PENDING_PLAYBACK_KEY)
}

function isMatchingEpisodeInfo(episode: Episode): boolean {
  const text = [
    document.querySelector(PRIME_PLAYER_EPISODE_INFO)?.textContent ?? '',
    document.querySelector(PRIME_PLAYER_TIMING)?.textContent ?? '',
    document.querySelector(PRIME_PLAYER_TITLE)?.textContent ?? '',
  ].join(' ')
  const normalized = text.normalize('NFKC').replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
  return normalized.includes(episode.normalizedTitle ?? '')
    && (episode.episodeNumber === null || new RegExp(`\\bE${episode.episodeNumber}\\b`, 'iu').test(text))
}

const primeRuntime: ProviderRuntime = {
  id: 'prime-video',

  matches(url) {
    return new URL(url).hostname === PRIME_HOST
  },

  start(callback: PageChangeCallback) {
    startObserver(callback)
  },

  stop() {
    stopObserver()
    knownDetailIds.clear()
    clearPlayback(new DOMException('The operation was aborted.', 'AbortError'))
  },

  getTitleContext(url) {
    return getPrimeTitleContext(url)
  },

  resolveTitleRoot: resolveRoot,

  detectSeries(context, root): DetectionResult {
    const playable = [...root.querySelectorAll<HTMLElement>(PRIME_EPISODE_ROW)]
      .some((row) => isPrimeRowEligible(row))
    return {
      status: playable ? 'series' : 'unconfirmed',
      titleId: context.titleId,
      signals: playable ? ['eligible-episode-row'] : [],
    }
  },

  observeForTitleRoot(generation) {
    observeForTitleRoot(generation)
  },

  observeTitleRoot(root, generation) {
    observeTitleRoot(root, generation)
  },

  clearObservation() {
    clearObservation()
  },

  async waitForButtonPlacement(root, signal): Promise<ButtonPlacement | null> {
    const mainPlay = await waitForElement<HTMLElement>(
      [PRIME_MAIN_PLAY],
      5_000,
      root,
      signal,
    )
    const container = mainPlay?.parentElement
    if (mainPlay === null || container === null || container === undefined) return null
    const placementContainer: HTMLElement = container
    return {
      spawnRoot: root,
      place(button) {
        if (!mainPlay.isConnected || !root.contains(mainPlay)) {
          throw new PlaybackResolutionError('Prime main play action is no longer available')
        }
        placementContainer.insertBefore(button, mainPlay.nextSibling)
      },
    }
  },

  async discoverEpisodes(context, root, signal): Promise<SeriesInfo> {
    for (const link of root.querySelectorAll<HTMLAnchorElement>(
      '[data-testid="dp-season-selector"] a[href*="/detail/"]',
    )) {
      const detailId = getPrimeDetailId(new URL(link.href, window.location.href).href)
      if (detailId !== null) knownDetailIds.add(detailId)
    }
    const catalog = await discoverPrimeEpisodes(context, root, signal)
    return catalog
  },

  async playEpisode(episode, root, signal, assertCurrent) {
    const currentRoot = resolveRoot() ?? root
    const selectedSeasonId = episode.seasonKey.replace(/^detail:/u, '')
    const currentDetailId = getPrimeDetailId(window.location.href)
    if (currentDetailId !== null && currentDetailId !== selectedSeasonId) {
      const link = [...currentRoot.querySelectorAll<HTMLAnchorElement>(
        '[data-testid="dp-season-selector"] a[href*="/detail/"]',
      )].find((candidate) => (
        getPrimeDetailId(new URL(candidate.href, window.location.href).href) === selectedSeasonId
      ))
      if (link === undefined) {
        throw new PlaybackResolutionError('Prime selected season could not be activated')
      }
      writePendingPlayback(episode, selectedSeasonId)
      link.click()
      return
    }

    const rows = [...currentRoot.querySelectorAll<HTMLElement>(PRIME_EPISODE_ROW)]
      .filter((row) => isPrimeRowEligible(row))
    const row = resolvePrimeEpisodeRow(episode, rows)
    const action = row?.querySelector<HTMLElement>(PRIME_EPISODE_PLAY)
    if (action === null || action === undefined) {
      throw new PlaybackResolutionError('Prime episode could not be resolved uniquely')
    }
    if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
    assertCurrent()
    writePendingPlayback(episode, selectedSeasonId)
    action.click()
  },

  waitForPlaybackConfirmation(episode, signal): Promise<void> {
    if (playbackWaiter !== null) clearPlayback(new DOMException('The operation was aborted.', 'AbortError'))
    if (signal.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
    return new Promise((resolve, reject) => {
      const abort = (): void => clearPlayback(new DOMException('The operation was aborted.', 'AbortError'))
      const timer = window.setTimeout(() => clearPlayback(new PlaybackResolutionError('Playback did not start')), PLAYBACK_TIMEOUT_MS)
      playbackWaiter = { episode, timer, signal, resolve, reject, abort }
      signal.addEventListener('abort', abort, { once: true })
      const check = (): void => {
        if (playbackWaiter?.episode !== episode) return
        const ready = document.querySelector(PRIME_PLAYER) !== null
          && document.querySelector(PRIME_PLAYER_SURFACE) !== null
          && isMatchingEpisodeInfo(episode)
          && document.querySelector(PRIME_LOADING) === null
        if (ready) clearPlayback()
        else window.setTimeout(check, 100)
      }
      check()
    })
  },

  isInternalNavigation(url) {
    const detailId = getPrimeDetailId(url)
    return detailId !== null && knownDetailIds.has(detailId)
  },

  getPendingPlayback() {
    return readPendingPlayback()?.episode ?? null
  },

  resumePendingPlayback(episode, root, signal, assertCurrent) {
    return primeRuntime.playEpisode(episode, root, signal, assertCurrent)
  },

  hasPendingOperation() {
    return readPendingPlayback() !== null
      || window.sessionStorage.getItem(PENDING_DISCOVERY_KEY) !== null
  },

  notifyRouteChange() {
    if (currentPrimeContext() === null) clearPlayback()
  },
}

export default primeRuntime
