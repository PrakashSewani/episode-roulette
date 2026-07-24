import { detectSeries, getTitleContext } from './netflix/detector'
import {
  clearTitleObservation,
  observeForTitleRoot,
  observeTitleRoot,
  onStart,
  onStop,
} from './netflix/observer'
import {
  PLAY_BUTTON,
  TITLE_DETAILS_METADATA,
  TITLE_DETAILS_ROOT,
} from './netflix/selectors'
import {
  CacheValidationMismatchError,
  DiscoveryIncompleteError,
  NoEpisodesError,
  PlaybackResolutionError,
  type Episode,
  type OperationContext,
  type PageChangeEvent,
  type SeriesInfo,
  type TitleContext,
} from './types'
import type { ButtonController } from './types'
import { dismissToast, showErrorToast, showStatusToast } from './ui/feedback'
import { injectButton } from './ui/button'
import { injectStyles, removeStyles } from './ui/styles'
import { discoverEpisodes } from './discovery/season-traverser'
import { playEpisode } from './engine/navigator'
import { pickRandom } from './engine/randomizer'

const DETECTION_TIMEOUT_MS = 5_000
const PLAYBACK_CONFIRMATION_TIMEOUT_MS = 5_000

let started = false
let generation = 0
let activeContext: OperationContext | null = null
let activeRoot: HTMLElement | null = null
let detectionTimer: number | null = null
let seriesConfirmed = false
let buttonController: ButtonController | null = null
const catalogCache = new Map<string, SeriesInfo>()

interface PlaybackConfirmation {
  context: OperationContext
  timer: number
  resolve: () => void
  reject: (error: Error) => void
  abort: () => void
}

let playbackConfirmation: PlaybackConfirmation | null = null

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

function isCurrent(context: OperationContext): boolean {
  return !context.controller.signal.aborted
    && activeContext?.generation === context.generation
    && activeContext.title.titleId === context.title.titleId
}

function clearDetectionTimer(): void {
  if (detectionTimer !== null) {
    window.clearTimeout(detectionTimer)
    detectionTimer = null
  }
}

function expireDetection(context: OperationContext): void {
  if (!isCurrent(context) || seriesConfirmed) {
    return
  }

  clearTitleObservation()
  clearDetectionTimer()
}

function scheduleDetectionExpiry(context: OperationContext): void {
  clearDetectionTimer()
  const remaining = context.detectionDeadline - performance.now()

  if (remaining <= 0) {
    expireDetection(context)
    return
  }

  detectionTimer = window.setTimeout(() => expireDetection(context), remaining)
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function assertCurrent(context: OperationContext, root: HTMLElement): void {
  if (!isCurrent(context) || activeRoot !== root) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }
}

function formatSelection(episode: Episode): string {
  const episodeNumber = episode.episodeNumber ?? episode.episodeIndex + 1
  const title = episode.title === 'Unknown Episode' ? '' : `: ${episode.title}`
  return `Selected ${episode.seasonLabel}, Episode ${episodeNumber}${title}`
}

function showSelection(context: OperationContext, root: HTMLElement, episode: Episode): void {
  assertCurrent(context, root)
  showStatusToast(formatSelection(episode))
}

function clearPlaybackConfirmation(error?: Error): void {
  const confirmation = playbackConfirmation
  if (confirmation === null) return
  playbackConfirmation = null
  window.clearTimeout(confirmation.timer)
  confirmation.context.controller.signal.removeEventListener('abort', confirmation.abort)
  if (error === undefined) confirmation.resolve()
  else confirmation.reject(error)
}

function waitForPlaybackStart(context: OperationContext): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = (): void => {
      if (playbackConfirmation?.context === context) {
        clearPlaybackConfirmation(new DOMException('The operation was aborted.', 'AbortError'))
      }
    }
    const timer = window.setTimeout(() => {
      if (playbackConfirmation?.context === context) {
        clearPlaybackConfirmation(new PlaybackResolutionError('Playback did not start'))
      }
    }, PLAYBACK_CONFIRMATION_TIMEOUT_MS)
    playbackConfirmation = { context, timer, resolve, reject, abort }
    context.controller.signal.addEventListener('abort', abort, { once: true })
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof DiscoveryIncompleteError) {
    return 'Could not load all seasons. Try again.'
  }
  if (error instanceof NoEpisodesError) {
    return 'No episodes found'
  }
  if (error instanceof CacheValidationMismatchError || error instanceof PlaybackResolutionError) {
    return error.message === 'Playback did not start'
      ? 'Could not start playback. Try again.'
      : 'Could not open the selected episode. Try again.'
  }
  return 'Something went wrong. Try again.'
}

async function discoverAndCache(
  context: OperationContext,
  root: HTMLElement,
): Promise<SeriesInfo> {
  const catalog = await discoverEpisodes(
    context.title.titleId,
    root,
    context.controller.signal,
  )
  assertCurrent(context, root)
  catalogCache.set(context.title.titleId, catalog)
  return catalog
}

async function selectAndPlay(
  context: OperationContext,
  root: HTMLElement,
  catalog: SeriesInfo,
): Promise<void> {
  assertCurrent(context, root)
  const episode = pickRandom(catalog.episodes)
  showSelection(context, root, episode)
  await playEpisode(
    episode,
    root,
    context.controller.signal,
    () => assertCurrent(context, root),
  )
}

async function runPlayback(
  context: OperationContext,
  root: HTMLElement,
  controller: ButtonController,
): Promise<void> {
  dismissToast()
  controller.setState('loading')
  try {
    let catalog = catalogCache.get(context.title.titleId)
      ?? await discoverAndCache(context, root)
    try {
      await selectAndPlay(context, root, catalog)
    } catch (error) {
      if (!(error instanceof CacheValidationMismatchError)) throw error
      assertCurrent(context, root)
      catalogCache.delete(context.title.titleId)
      catalog = await discoverAndCache(context, root)
      await selectAndPlay(context, root, catalog)
    }
    await waitForPlaybackStart(context)
  } catch (error) {
    if (isAbortError(error)) return
    console.error('[Episode Roulette] Random playback failed', error)
    if (isCurrent(context) && activeRoot === root && buttonController === controller) {
      const message = errorMessage(error)
      controller.setState('error', message)
      showErrorToast(message)
    }
  }
}

async function injectSeriesButton(
  context: OperationContext,
  root: HTMLElement,
): Promise<void> {
  try {
    const controller = await injectButton(root, context.controller.signal)
    if (!isCurrent(context) || activeRoot !== root) {
      controller?.remove()
      return
    }

    buttonController = controller
    controller?.onClick(() => {
      void runPlayback(context, root, controller)
    })
  } catch (error) {
    if (!isAbortError(error)) {
      console.error('[Episode Roulette] Failed to inject button', error)
    }
  }
}

function detectWithinRoot(context: OperationContext, root: HTMLElement): void {
  if (!isCurrent(context) || performance.now() >= context.detectionDeadline) {
    expireDetection(context)
    return
  }

  if (detectSeries(context.title, root).status === 'series') {
    seriesConfirmed = true
    clearDetectionTimer()
    void injectSeriesButton(context, root)
  }
}

function locateAndObserveRoot(context: OperationContext): void {
  if (!isCurrent(context) || performance.now() >= context.detectionDeadline) {
    expireDetection(context)
    return
  }

  const root = resolveTitleRoot()
  if (root === null) {
    activeRoot = null
    observeForTitleRoot(context.generation)
    return
  }

  activeRoot = root
  observeTitleRoot(root, context.generation)
  detectWithinRoot(context, root)
}

function invalidateActiveContext(): void {
  if (playbackConfirmation !== null) {
    clearPlaybackConfirmation(new DOMException('The operation was aborted.', 'AbortError'))
  }
  activeContext?.controller.abort()
  generation += 1
  buttonController?.remove()
  buttonController = null
  dismissToast()
  activeContext = null
  activeRoot = null
  seriesConfirmed = false
  clearDetectionTimer()
  clearTitleObservation()
}

function beginTitleContext(title: TitleContext, detectionDeadline: number): void {
  invalidateActiveContext()
  const context: OperationContext = {
    title,
    generation,
    controller: new AbortController(),
    detectionDeadline,
  }

  activeContext = context
  scheduleDetectionExpiry(context)
  locateAndObserveRoot(context)
}

function replaceTitleRoot(context: OperationContext): void {
  if (!isCurrent(context)) {
    return
  }

  const { title, detectionDeadline } = context
  if (performance.now() >= detectionDeadline) {
    invalidateActiveContext()
    return
  }

  beginTitleContext(title, detectionDeadline)
}

function handleRouteChange(url: string): void {
  const pathname = new URL(url).pathname
  if (pathname.startsWith('/watch/')) {
    if (playbackConfirmation !== null) clearPlaybackConfirmation()
    invalidateActiveContext()
    return
  }
  const title = getTitleContext(url)
  if (title === null) {
    invalidateActiveContext()
    return
  }

  if (activeContext?.title.titleId === title.titleId) {
    activeContext.title = title
    if (
      activeRoot !== null
      && activeRoot.isConnected
      && (seriesConfirmed || performance.now() < activeContext.detectionDeadline)
    ) {
      observeTitleRoot(activeRoot, activeContext.generation)
    } else if (!seriesConfirmed && performance.now() < activeContext.detectionDeadline) {
      locateAndObserveRoot(activeContext)
    }
    return
  }

  beginTitleContext(title, performance.now() + DETECTION_TIMEOUT_MS)
}

function handlePageChange(event: PageChangeEvent): void {
  if (event.type === 'route-changed') {
    handleRouteChange(event.url)
    return
  }

  const context = activeContext
  if (context === null || event.generation !== context.generation) {
    return
  }

  if (event.type === 'title-root-removed') {
    replaceTitleRoot(context)
    return
  }

  if (activeRoot === null) {
    locateAndObserveRoot(context)
  } else if (!seriesConfirmed) {
    detectWithinRoot(context, activeRoot)
  }
}

export function start(): void {
  if (started) {
    return
  }

  started = true
  injectStyles()
  window.addEventListener('pagehide', stop)
  onStart(handlePageChange)
}

export function stop(): void {
  if (!started) {
    return
  }

  started = false
  window.removeEventListener('pagehide', stop)
  invalidateActiveContext()
  onStop()
  removeStyles()
  catalogCache.clear()
}

start()
