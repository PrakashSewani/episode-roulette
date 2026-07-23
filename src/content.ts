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
import type { OperationContext, PageChangeEvent, TitleContext } from './types'
import type { ButtonController } from './types'
import { dismissToast } from './ui/feedback'
import { injectButton } from './ui/button'
import { injectStyles, removeStyles } from './ui/styles'

const DETECTION_TIMEOUT_MS = 5_000

let started = false
let generation = 0
let activeContext: OperationContext | null = null
let activeRoot: HTMLElement | null = null
let detectionTimer: number | null = null
let seriesConfirmed = false
let buttonController: ButtonController | null = null

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
}

start()
