import { logError, logInfo, logWarning } from './debug'
import { getProvider } from './providers'
import {
  CacheValidationMismatchError,
  DiscoveryIncompleteError,
  getCatalogKey,
  NoEpisodesError,
  PlaybackResolutionError,
  type CatalogKey,
  type Episode,
  type OperationContext,
  type PageChangeEvent,
  type PopupMessage,
  type PopupMessageResponse,
  type PopupStatus,
  type ProviderRuntime,
  type SeriesInfo,
  type TitleContext,
} from './types'
import type { ButtonController } from './types'
import { dismissToast, showErrorToast, showStatusToast } from './ui/feedback'
import { injectButton } from './ui/button'
import { injectStyles, removeStyles } from './ui/styles'
import { pickRandom } from './engine/randomizer'
import { seekToBeginning } from './engine/restart'

const DETECTION_TIMEOUT_MS = 5_000
const PENDING_RESTART_WINDOW_MS = 15_000

let started = false
let generation = 0
let activeContext: OperationContext | null = null
let activeProvider: ProviderRuntime | null = null
let startedProvider: ProviderRuntime | null = null
let activeRoot: HTMLElement | null = null
let detectionTimer: number | null = null
let seriesConfirmed = false
let buttonController: ButtonController | null = null
let restartController: AbortController | null = null
let pendingRestartUntil = 0
const catalogCache = new Map<CatalogKey, SeriesInfo>()

function isCurrent(context: OperationContext): boolean {
  return !context.controller.signal.aborted
    && activeContext?.generation === context.generation
    && activeContext.title.provider === context.title.provider
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
  activeProvider?.clearObservation()
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
  const provider = activeProvider
  if (provider === null) {
    throw new DiscoveryIncompleteError('No provider is active')
  }
  logInfo('Discovering complete catalog', {
    provider: provider.id,
    titleId: context.title.titleId,
    generation: context.generation,
  })
  const catalog = await provider.discoverEpisodes(
    context.title,
    root,
    context.controller.signal,
  )
  assertCurrent(context, root)
  catalogCache.set(getCatalogKey(context.title.provider, context.title.titleId), catalog)
  logInfo('Catalog cached', {
    provider: catalog.provider,
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
  const provider = activeProvider
  if (provider === null) {
    throw new PlaybackResolutionError('No provider is active')
  }
  assertCurrent(context, root)
  const episode = pickRandom(catalog.episodes)
  logInfo('Selected random episode', {
    provider: provider.id,
    seasonKey: episode.seasonKey,
    seasonLabel: episode.seasonLabel,
    episodeNumber: episode.episodeNumber,
    episodeIndex: episode.episodeIndex,
    title: episode.title,
    poolSize: catalog.episodes.length,
  })
  showSelection(context, root, episode)
  logInfo('Starting native playback resolution')
  await provider.playEpisode(
    episode,
    root,
    context.controller.signal,
    () => assertCurrent(context, root),
  )
  logInfo('Native episode click completed; waiting for provider confirmation')
  if (provider.id === 'netflix') {
    armPendingRestart()
  }
  await provider.waitForPlaybackConfirmation(episode, context.controller.signal)
}

async function runPlayback(
  context: OperationContext,
  root: HTMLElement,
  controller: ButtonController,
): Promise<void> {
  const cacheKey = getCatalogKey(context.title.provider, context.title.titleId)
  logInfo('Random roll started', {
    provider: context.title.provider,
    titleId: context.title.titleId,
    generation: context.generation,
    buttonState: controller.getState(),
    cacheHit: catalogCache.has(cacheKey),
  })
  dismissToast()
  controller.setState('loading')
  logInfo('Button state → loading')
  try {
    let catalog = catalogCache.get(cacheKey)
    if (catalog !== undefined) {
      logInfo('Using cached catalog', {
        provider: catalog.provider,
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
      catalogCache.delete(cacheKey)
      catalog = await discoverAndCache(context, root)
      await selectAndPlay(context, root, catalog)
    }
    logInfo('Provider playback confirmed')
  } catch (error) {
    if (isAbortError(error)) {
      logInfo('Random roll aborted', {
        provider: context.title.provider,
        titleId: context.title.titleId,
        generation: context.generation,
      })
      return
    }
    clearPendingRestart()
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
  const provider = activeProvider
  if (provider === null) {
    return
  }
  try {
    const controller = await injectButton(
      root,
      provider.waitForButtonPlacement(root, context.controller.signal),
      context.controller.signal,
    )
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

  const provider = activeProvider
  if (provider === null) {
    return
  }
  const result = provider.detectSeries(context.title, root)
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

  const provider = activeProvider
  if (provider === null) {
    return
  }
  const root = provider.resolveTitleRoot()
  if (root === null) {
    logInfo('Title root not found; watching document body', {
      titleId: context.title.titleId,
      generation: context.generation,
    })
    activeRoot = null
    provider.observeForTitleRoot(context.generation)
    return
  }

  logInfo('Title root resolved', {
    titleId: context.title.titleId,
    generation: context.generation,
  })
  activeRoot = root
  provider.observeTitleRoot(root, context.generation)
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
  activeContext?.controller.abort()
  activeProvider?.clearObservation()
  generation += 1
  buttonController?.remove()
  buttonController = null
  dismissToast()
  activeContext = null
  activeProvider = null
  activeRoot = null
  seriesConfirmed = false
  clearDetectionTimer()
}

function beginTitleContext(title: TitleContext, detectionDeadline: number): void {
  logInfo('Begin title context', {
    titleId: title.titleId,
    source: title.source,
    url: title.url,
    generation,
  })
  invalidateActiveContext()
  activeProvider = getProvider(title.url)
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
  const provider = getProvider(url)
  logInfo('Route change', { url, pathname, provider: provider?.id ?? null })
  if (pathname.startsWith('/watch/')) {
    const fromRandomRoll = consumePendingRestart()
    provider?.notifyRouteChange(url)
    if (fromRandomRoll) startRestartSeek()
    invalidateActiveContext()
    return
  }

  restartController?.abort()
  restartController = null

  const title = provider?.getTitleContext(url) ?? null
  if (title === null || provider === null) {
    logInfo('No supported provider title context on route; clearing active work')
    clearPendingRestart()
    invalidateActiveContext()
    return
  }

  logInfo('Title context from URL', {
    provider: title.provider,
    titleId: title.titleId,
    source: title.source,
  })

  if (
    activeContext?.title.provider === title.provider
    && activeContext.title.titleId === title.titleId
  ) {
    logInfo('Same title identity retained', {
      provider: title.provider,
      titleId: title.titleId,
      seriesConfirmed,
      hasRoot: activeRoot !== null,
    })
    activeContext.title = title
    activeProvider = provider
    if (
      activeRoot !== null
      && activeRoot.isConnected
      && (seriesConfirmed || performance.now() < activeContext.detectionDeadline)
    ) {
      provider.observeTitleRoot(activeRoot, activeContext.generation)
    } else if (!seriesConfirmed && performance.now() < activeContext.detectionDeadline) {
      locateAndObserveRoot(activeContext)
    }
    return
  }

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
  const provider = getProvider(window.location.href)
  if (provider !== null) {
    startedProvider = provider
    provider.start(handlePageChange)
  }
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
  startedProvider?.stop()
  startedProvider = null
  removeStyles()
  catalogCache.clear()
  logInfo('Episode Roulette stopped')
}

start()
