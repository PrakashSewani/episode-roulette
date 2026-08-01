import { logError, logInfo, logWarning } from './debug'
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
  type PopupMessage,
  type PopupMessageResponse,
  type PopupStatus,
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
import { seekToBeginning } from './engine/restart'

const DETECTION_TIMEOUT_MS = 5_000
const PLAYBACK_CONFIRMATION_TIMEOUT_MS = 5_000
const PENDING_RESTART_WINDOW_MS = 15_000

let started = false
let generation = 0
let activeContext: OperationContext | null = null
let activeRoot: HTMLElement | null = null
let detectionTimer: number | null = null
let seriesConfirmed = false
let buttonController: ButtonController | null = null
let restartController: AbortController | null = null
let pendingRestartUntil = 0
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

  logInfo('Detection deadline expired without series confirmation', {
    titleId: context.title.titleId,
    generation: context.generation,
  })
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
  // Timeout/failure means playback never started; do not keep a stale restart arm.
  // Abort/success leave pendingRestart for the /watch/ consumer (title root often dies first).
  if (error !== undefined && error.name !== 'AbortError') {
    clearPendingRestart()
  }
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

function armPendingRestart(): void {
  pendingRestartUntil = performance.now() + PENDING_RESTART_WINDOW_MS
  logInfo('Armed pending restart window', { windowMs: PENDING_RESTART_WINDOW_MS })
}

function consumePendingRestart(): boolean {
  const armed = performance.now() < pendingRestartUntil
  pendingRestartUntil = 0
  logInfo('Consume pending restart', { armed })
  return armed
}

function clearPendingRestart(): void {
  if (pendingRestartUntil !== 0) {
    logInfo('Cleared pending restart arm')
  }
  pendingRestartUntil = 0
}

function startRestartSeek(): void {
  logInfo('Starting seek-to-beginning after /watch/')
  restartController?.abort()
  const controller = new AbortController()
  restartController = controller
  void seekToBeginning(controller.signal).finally(() => {
    if (restartController === controller) {
      restartController = null
    }
    logInfo('Seek-to-beginning finished')
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
  logInfo('Discovering complete catalog', {
    titleId: context.title.titleId,
    generation: context.generation,
  })
  const catalog = await discoverEpisodes(
    context.title.titleId,
    root,
    context.controller.signal,
  )
  assertCurrent(context, root)
  catalogCache.set(context.title.titleId, catalog)
  logInfo('Catalog cached', {
    titleId: catalog.id,
    totalSeasons: catalog.totalSeasons,
    episodeCount: catalog.episodes.length,
  })
  return catalog
}

async function selectAndPlay(
  context: OperationContext,
  root: HTMLElement,
  catalog: SeriesInfo,
): Promise<void> {
  assertCurrent(context, root)
  const episode = pickRandom(catalog.episodes)
  logInfo('Selected random episode', {
    seasonKey: episode.seasonKey,
    seasonLabel: episode.seasonLabel,
    episodeNumber: episode.episodeNumber,
    episodeIndex: episode.episodeIndex,
    title: episode.title,
    poolSize: catalog.episodes.length,
  })
  showSelection(context, root, episode)
  logInfo('Starting native playback resolution')
  await playEpisode(
    episode,
    root,
    context.controller.signal,
    () => assertCurrent(context, root),
  )
  logInfo('Native episode click completed; waiting for /watch/')
  armPendingRestart()
}

async function runPlayback(
  context: OperationContext,
  root: HTMLElement,
  controller: ButtonController,
): Promise<void> {
  logInfo('Random roll started', {
    titleId: context.title.titleId,
    generation: context.generation,
    buttonState: controller.getState(),
    cacheHit: catalogCache.has(context.title.titleId),
  })
  dismissToast()
  controller.setState('loading')
  logInfo('Button state → loading')
  try {
    let catalog = catalogCache.get(context.title.titleId)
    if (catalog !== undefined) {
      logInfo('Using cached catalog', {
        titleId: catalog.id,
        totalSeasons: catalog.totalSeasons,
        episodeCount: catalog.episodes.length,
      })
    } else {
      catalog = await discoverAndCache(context, root)
    }
    try {
      await selectAndPlay(context, root, catalog)
    } catch (error) {
      if (!(error instanceof CacheValidationMismatchError)) throw error
      logWarning('Cache validation mismatch; rediscovering once', error)
      assertCurrent(context, root)
      catalogCache.delete(context.title.titleId)
      catalog = await discoverAndCache(context, root)
      await selectAndPlay(context, root, catalog)
    }
    await waitForPlaybackStart(context)
    logInfo('Playback confirmed on /watch/')
  } catch (error) {
    if (isAbortError(error)) {
      logInfo('Random roll aborted', {
        titleId: context.title.titleId,
        generation: context.generation,
      })
      return
    }
    logError('Random playback failed', error)
    if (isCurrent(context) && activeRoot === root && buttonController === controller) {
      const message = errorMessage(error)
      controller.setState('error', message)
      logInfo('Button state → error', { message })
      showErrorToast(message)
    } else {
      logWarning('Suppressed error UI; context no longer current')
    }
  }
}

async function injectSeriesButton(
  context: OperationContext,
  root: HTMLElement,
): Promise<void> {
  logInfo('Injecting Random Episode button', {
    titleId: context.title.titleId,
    generation: context.generation,
  })
  try {
    const controller = await injectButton(root, context.controller.signal)
    if (!isCurrent(context) || activeRoot !== root) {
      logInfo('Discarding button; context/root no longer current')
      controller?.remove()
      return
    }

    buttonController = controller
    if (controller === null) {
      logWarning('Button injection returned null (Play placement failed)')
      return
    }
    logInfo('Button ready; click handler attached', {
      state: controller.getState(),
    })
    controller.onClick(() => {
      logInfo('In-page Random Episode clicked', {
        state: controller.getState(),
        titleId: context.title.titleId,
        generation: context.generation,
      })
      void runPlayback(context, root, controller)
    })
  } catch (error) {
    if (!isAbortError(error)) {
      logError('Failed to inject button', error)
    } else {
      logInfo('Button injection aborted')
    }
  }
}

function detectWithinRoot(context: OperationContext, root: HTMLElement): void {
  if (!isCurrent(context) || performance.now() >= context.detectionDeadline) {
    expireDetection(context)
    return
  }

  const result = detectSeries(context.title, root)
  logInfo('Series detection result', {
    titleId: context.title.titleId,
    status: result.status,
  })
  if (result.status === 'series') {
    seriesConfirmed = true
    clearDetectionTimer()
    logInfo('Series confirmed', { titleId: context.title.titleId })
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
    logInfo('Title root not found; watching document body', {
      titleId: context.title.titleId,
      generation: context.generation,
    })
    activeRoot = null
    observeForTitleRoot(context.generation)
    return
  }

  logInfo('Title root resolved', {
    titleId: context.title.titleId,
    generation: context.generation,
  })
  activeRoot = root
  observeTitleRoot(root, context.generation)
  detectWithinRoot(context, root)
}

function invalidateActiveContext(): void {
  if (activeContext !== null) {
    logInfo('Invalidating active context', {
      titleId: activeContext.title.titleId,
      generation: activeContext.generation,
      seriesConfirmed,
    })
  }
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
  logInfo('Begin title context', {
    titleId: title.titleId,
    source: title.source,
    url: title.url,
    generation,
  })
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
  logInfo('Route change', { url, pathname })
  if (pathname.startsWith('/watch/')) {
    const fromRandomRoll = consumePendingRestart()
    if (playbackConfirmation !== null) clearPlaybackConfirmation()
    if (fromRandomRoll) startRestartSeek()
    invalidateActiveContext()
    return
  }

  restartController?.abort()
  restartController = null

  const title = getTitleContext(url)
  if (title === null) {
    logInfo('No title context on route; clearing active work')
    // Left title/details without reaching /watch/; drop unused restart arm.
    clearPendingRestart()
    invalidateActiveContext()
    return
  }

  logInfo('Title context from URL', {
    titleId: title.titleId,
    source: title.source,
  })

  if (activeContext?.title.titleId === title.titleId) {
    logInfo('Same title identity retained', {
      titleId: title.titleId,
      seriesConfirmed,
      hasRoot: activeRoot !== null,
    })
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

  // New title means the prior roll's pending restart no longer applies.
  clearPendingRestart()
  beginTitleContext(title, performance.now() + DETECTION_TIMEOUT_MS)
}

function handlePageChange(event: PageChangeEvent): void {
  if (event.type === 'route-changed') {
    handleRouteChange(event.url)
    return
  }

  const context = activeContext
  if (context === null || event.generation !== context.generation) {
    logInfo('Ignoring stale page event', {
      type: event.type,
      eventGeneration: event.generation,
      activeGeneration: context?.generation ?? null,
    })
    return
  }

  if (event.type === 'title-root-removed') {
    logInfo('Title root removed; replacing context', {
      titleId: context.title.titleId,
      generation: context.generation,
    })
    replaceTitleRoot(context)
    return
  }

  logInfo('Title DOM changed', {
    titleId: context.title.titleId,
    generation: context.generation,
    hasRoot: activeRoot !== null,
    seriesConfirmed,
  })
  if (activeRoot === null) {
    locateAndObserveRoot(context)
  } else if (!seriesConfirmed) {
    detectWithinRoot(context, activeRoot)
  }
}

function getPopupStatus(): PopupStatus {
  if (!seriesConfirmed || activeContext === null || activeRoot === null) {
    return 'no-series'
  }
  if (buttonController === null) {
    return 'no-series'
  }
  const state = buttonController.getState()
  if (state === 'loading') return 'loading'
  if (state === 'error') return 'error'
  return 'ready'
}

function handleMessage(
  message: PopupMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: PopupMessageResponse) => void,
): boolean {
  logInfo('Popup message received', { type: message.type })
  if (message.type === 'getStatus') {
    const status = getPopupStatus()
    logInfo('Popup status response', { status })
    sendResponse({ type: 'status', status })
    return false
  }

  if (message.type === 'roll') {
    const status = getPopupStatus()
    if (status === 'no-series' || status === 'loading') {
      logWarning('Popup roll rejected', { reason: status })
      sendResponse({ type: 'roll-rejected', reason: status })
      return false
    }

    const context = activeContext
    const root = activeRoot
    const controller = buttonController
    if (context === null || root === null || controller === null) {
      logWarning('Popup roll rejected: missing context/root/controller')
      sendResponse({ type: 'roll-rejected', reason: 'no-series' })
      return false
    }

    logInfo('Popup roll accepted')
    sendResponse({ type: 'roll-accepted' })
    void runPlayback(context, root, controller)
    return false
  }

  return false
}

let messageListenerRegistered = false

function registerMessageListener(): void {
  if (messageListenerRegistered) return
  chrome.runtime.onMessage.addListener(handleMessage)
  messageListenerRegistered = true
}

function unregisterMessageListener(): void {
  if (!messageListenerRegistered) return
  chrome.runtime.onMessage.removeListener(handleMessage)
  messageListenerRegistered = false
}

export function start(): void {
  if (started) {
    logInfo('start() ignored; already started')
    return
  }

  started = true
  logInfo('Episode Roulette loaded', {
    href: window.location.href,
    userAgent: navigator.userAgent,
  })
  injectStyles()
  window.addEventListener('pagehide', stop)
  registerMessageListener()
  onStart(handlePageChange)
}

export function stop(): void {
  if (!started) {
    return
  }

  logInfo('Episode Roulette stopping')
  started = false
  window.removeEventListener('pagehide', stop)
  unregisterMessageListener()
  clearPendingRestart()
  restartController?.abort()
  restartController = null
  invalidateActiveContext()
  onStop()
  removeStyles()
  catalogCache.clear()
  logInfo('Episode Roulette stopped')
}

start()
