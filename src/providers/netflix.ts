import { discoverEpisodes } from '../discovery/season-traverser'
import { playEpisode } from '../engine/navigator'
import {
  detectSeries,
  getTitleContext as getNetflixTitleContext,
  type NetflixTitleContext,
} from '../netflix/detector'
import {
  clearTitleObservation,
  observeForTitleRoot,
  observeTitleRoot,
  onStart,
  onStop,
} from '../netflix/observer'
import { waitForElement } from '../netflix/dom-utils'
import {
  PLAY_BUTTON,
  TITLE_DETAILS_METADATA,
  TITLE_DETAILS_ROOT,
} from '../netflix/selectors'
import {
  PlaybackResolutionError,
  type ButtonPlacement,
  type DetectionResult,
  type Episode,
  type PageChangeCallback,
  type ProviderRuntime,
  type SeriesInfo,
  type TitleContext,
} from '../types'

const NETFLIX_HOSTS = new Set(['netflix.com', 'www.netflix.com'])
const PLAYBACK_CONFIRMATION_TIMEOUT_MS = 5_000

interface PlaybackWaiter {
  episode: Episode
  signal: AbortSignal
  timer: number
  resolve: () => void
  reject: (error: Error) => void
  abort: () => void
}

let playbackWaiter: PlaybackWaiter | null = null

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  const hasLayoutBox = [...element.getClientRects()].some(
    (rect) => rect.width > 0 && rect.height > 0,
  )

  return hasLayoutBox
    && style.display !== 'none'
    && style.visibility !== 'hidden'
}

function containsAny(root: ParentNode, selectors: string[]): boolean {
  return selectors.some((selector) => root.querySelector(selector) !== null)
}

function resolveTitleRoot(): HTMLElement | null {
  const candidates = new Set<HTMLElement>()

  for (const selector of TITLE_DETAILS_ROOT.selectors) {
    for (const match of document.querySelectorAll<HTMLElement>(selector)) {
      candidates.add(match)
    }
  }

  const validCandidates = [...candidates].filter((candidate) => (
    candidate.isConnected
    && isVisible(candidate)
    && (
      containsAny(candidate, PLAY_BUTTON.selectors)
      || containsAny(candidate, TITLE_DETAILS_METADATA.selectors)
    )
  ))

  return validCandidates.length === 1 ? validCandidates[0] ?? null : null
}

function createNetflixTitleContext(url: string): TitleContext | null {
  const context = getNetflixTitleContext(url)
  return context === null ? null : { ...context, provider: 'netflix' }
}

function toNetflixTitleContext(context: TitleContext): NetflixTitleContext | null {
  if (context.provider !== 'netflix') {
    return null
  }
  if (context.source === 'prime-detail') {
    return null
  }
  return {
    titleId: context.titleId,
    source: context.source,
    url: context.url,
  }
}

function clearPlaybackWaiter(error?: Error): void {
  const waiter = playbackWaiter
  if (waiter === null) return
  playbackWaiter = null
  window.clearTimeout(waiter.timer)
  waiter.signal.removeEventListener('abort', waiter.abort)
  if (error === undefined) waiter.resolve()
  else waiter.reject(error)
}

const netflixRuntime: ProviderRuntime = {
  id: 'netflix',

  matches(url) {
    return NETFLIX_HOSTS.has(new URL(url).hostname)
  },

  start(callback: PageChangeCallback) {
    onStart(callback)
  },

  stop() {
    clearPlaybackWaiter(new DOMException('The operation was aborted.', 'AbortError'))
    onStop()
  },

  getTitleContext(url) {
    return createNetflixTitleContext(url)
  },

  resolveTitleRoot,

  detectSeries(context, root): DetectionResult {
    const netflixContext = toNetflixTitleContext(context)
    if (netflixContext === null) {
      return { status: 'unconfirmed', titleId: context.titleId, signals: [] }
    }
    return detectSeries(netflixContext, root)
  },

  observeForTitleRoot,
  observeTitleRoot,
  clearObservation: clearTitleObservation,

  async waitForButtonPlacement(
    root: HTMLElement,
    signal: AbortSignal,
  ): Promise<ButtonPlacement | null> {
    const playButton = await waitForElement<HTMLElement>(
      PLAY_BUTTON.selectors,
      5_000,
      root,
      signal,
    )
    if (playButton === null || playButton.parentElement === null) {
      return null
    }

    return {
      spawnRoot: root,
      place(button) {
        const container = playButton.parentElement
        if (container === null || !playButton.isConnected || !root.contains(playButton)) {
          throw new PlaybackResolutionError('Netflix Play button is no longer available')
        }
        container.insertBefore(button, playButton.nextSibling)
      },
    }
  },

  async discoverEpisodes(context, root, signal): Promise<SeriesInfo> {
    const catalog = await discoverEpisodes(context.titleId, root, signal)
    return { ...catalog, provider: 'netflix' }
  },

  playEpisode(episode, root, signal, assertCurrent) {
    return playEpisode(episode, root, signal, assertCurrent)
  },

  waitForPlaybackConfirmation(episode, signal): Promise<void> {
    if (playbackWaiter !== null) {
      clearPlaybackWaiter(new DOMException('The operation was aborted.', 'AbortError'))
    }

    if (signal.aborted) {
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    return new Promise((resolve, reject) => {
      const abort = (): void => {
        if (playbackWaiter?.episode === episode) {
          clearPlaybackWaiter(new DOMException('The operation was aborted.', 'AbortError'))
        }
      }
      const timer = window.setTimeout(() => {
        if (playbackWaiter?.episode === episode) {
          clearPlaybackWaiter(new PlaybackResolutionError('Playback did not start'))
        }
      }, PLAYBACK_CONFIRMATION_TIMEOUT_MS)
      playbackWaiter = { episode, signal, timer, resolve, reject, abort }
      signal.addEventListener('abort', abort, { once: true })
    })
  },

  isInternalNavigation() {
    return false
  },

  getPendingPlayback() {
    return null
  },

  resumePendingPlayback(_episode, _root, _signal, _assertCurrent) {
    return Promise.reject(new PlaybackResolutionError('No pending Netflix playback'))
  },

  hasPendingOperation() {
    return false
  },

  notifyRouteChange(url) {
    if (new URL(url).pathname.startsWith('/watch/')) {
      clearPlaybackWaiter()
    }
  },
}

export default netflixRuntime
