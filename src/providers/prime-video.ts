import type {
  ButtonPlacement,
  DetectionResult,
  Episode,
  PageChangeCallback,
  ProviderRuntime,
  SeriesInfo,
} from '../types'
import { waitForElement } from '../netflix/dom-utils'
import { discoverPrimeEpisodes } from '../prime/discovery'
import { isPrimeRowEligible, resolvePrimeEpisodeRow } from '../prime/identity'
import { getPrimeDetailId, getPrimeTitleContext, PRIME_HOST } from '../prime/routes'
import {
  PRIME_DETAIL_ROOT,
  PRIME_EPISODE_PLAY,
  PRIME_EPISODE_ROW,
  PRIME_MAIN_PLAY,
  PRIME_MAIN_ROOT,
  PRIME_PLAYER,
  PRIME_PLAYER_CLOSE,
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
// The pending marker must survive complete multi-season discovery (up to 60s
// per discovery pending window); the confirmation timeout is separate.
const PENDING_PLAYBACK_TTL_MS = 60_000

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

function readPendingPlayback(): PendingPlayback | null {
  const raw = window.sessionStorage.getItem(PENDING_PLAYBACK_KEY)
  if (raw === null) return null
  try {
    const pending = JSON.parse(raw) as PendingPlayback
    if (pending.expiresAt <= Date.now()) {
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
    expiresAt: Date.now() + PENDING_PLAYBACK_TTL_MS,
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

function isPlaybackVideoReady(): boolean {
  // The episode video is the long player video (episode durations observed
  // 2583–3341 s); the trailer is short (30–122 s). Confirmation must require
  // the episode video to be playing, not merely any loaded video.
  return [...document.querySelectorAll<HTMLVideoElement>('video')]
    .some((video) => (
      (video.duration || 0) > 300
      && video.readyState >= 3
      && !video.paused
      && !video.ended
    ))
}

function isPlayerVisible(): boolean {
  const player = document.querySelector<HTMLElement>(PRIME_PLAYER)
  if (player === null || !player.isConnected) return false
  const style = window.getComputedStyle(player)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

async function closeOpenPlayer(signal: AbortSignal): Promise<void> {
  if (isPlayerVisible()) {
    document.querySelector<HTMLElement>(PRIME_PLAYER_CLOSE)?.click()
    // Prime hides the player asynchronously (fade-out). The episode-row click
    // must wait until the player is actually dismissed; otherwise Prime treats
    // the click as a trailer preview into the still-open player.
    const deadline = performance.now() + 3_000
    while (isPlayerVisible() && performance.now() < deadline) {
      if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100))
    }
  }
  // Prime keeps the player shell mounted and may be autoplaying a trailer in
  // the hidden player after season navigation. Pause any playing video so the
  // episode-row click starts the selected episode rather than continuing the
  // trailer.
  for (const video of document.querySelectorAll<HTMLVideoElement>('video')) {
    if (!video.paused) video.pause()
  }
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
        button.dataset.provider = 'prime-video'
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
      // Navigated to the selected season; the episode click happens on the
      // target page through resumePendingPlayback. Do not confirm here.
      return false
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
    await closeOpenPlayer(signal)
    assertCurrent()
    writePendingPlayback(episode, selectedSeasonId)
    action.click()
    return true
  },

  waitForPlaybackConfirmation(episode, signal): Promise<void> {
    if (playbackWaiter !== null) clearPlayback(new DOMException('The operation was aborted.', 'AbortError'))
    if (signal.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
    return new Promise((resolve, reject) => {
      const abort = (): void => clearPlayback(new DOMException('The operation was aborted.', 'AbortError'))
      const timer = window.setTimeout(() => clearPlayback(new PlaybackResolutionError('Playback did not start')), PLAYBACK_TIMEOUT_MS)
      playbackWaiter = { episode, timer, signal, resolve, reject, abort }
      signal.addEventListener('abort', abort, { once: true })
      let seenPlaying = false
      const check = (): void => {
        if (playbackWaiter?.episode !== episode) return
        const videoPlaying = isPlaybackVideoReady()
        // The episode video played at least once; a later player close (user
        // closed the player) resolves so the button returns to ready instead
        // of stuck loading.
        if (videoPlaying) seenPlaying = true
        const player = document.querySelector<HTMLElement>(PRIME_PLAYER)
        const playerClosed = player === null || !player.isConnected
          || window.getComputedStyle(player).display === 'none'
        if (seenPlaying && playerClosed) {
          clearPlayback()
          return
        }
        const ready = document.querySelector(PRIME_PLAYER) !== null
          && document.querySelector(PRIME_PLAYER_SURFACE) !== null
          && isMatchingEpisodeInfo(episode)
          && videoPlaying
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

  resetPendingOperations() {
    window.sessionStorage.removeItem(PENDING_PLAYBACK_KEY)
    window.sessionStorage.removeItem(PENDING_DISCOVERY_KEY)
  },

  notifyRouteChange() {
    // Never clear the pending playback marker here: it must survive season
    // navigation and transient non-detail routes until consumed or expired.
  },
}

export default primeRuntime
