import { logInfo, logWarning } from '../debug'
import { resilientQuery, waitForElement } from '../netflix/dom-utils'
import { PLAYER_TIMELINE, VIDEO_PLAYER } from '../netflix/selectors'

const VIDEO_FIND_TIMEOUT_MS = 10_000
const SETTLE_MS = 2_000
const RECHECK_MS = 2_000
const CONTROLS_REVEAL_MS = 250
// Primary scrub often lands ~1–3s (timeline edge + player padding). Recheck only if still clearly mid-episode.
const RESUME_THRESHOLD_SECONDS = 5

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      window.clearTimeout(timer)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function hasLayoutBox(element: HTMLElement): boolean {
  return [...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0)
}

function resolveTimeline(): HTMLElement | null {
  const match = resilientQuery<HTMLElement>(PLAYER_TIMELINE.selectors, document)
  if (match === null || !match.isConnected || !hasLayoutBox(match)) {
    return null
  }
  return match
}

function revealControls(video: HTMLVideoElement): void {
  const rect = video.getBoundingClientRect()
  const clientX = rect.left + Math.max(8, rect.width * 0.5)
  const clientY = rect.top + Math.max(8, rect.height * 0.5)
  video.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  }))
}

function clickTimelineStart(timeline: HTMLElement): void {
  const rect = timeline.getBoundingClientRect()
  // Absolute left edge. A 1%-width click landed ~13s mid-episode in live smoke.
  const clientX = rect.left + 1
  const clientY = rect.top + rect.height / 2
  const common = {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  } as const

  timeline.dispatchEvent(new PointerEvent('pointerdown', {
    ...common,
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 1,
  }))
  timeline.dispatchEvent(new MouseEvent('mousedown', { ...common, buttons: 1 }))
  timeline.dispatchEvent(new PointerEvent('pointerup', {
    ...common,
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 0,
  }))
  timeline.dispatchEvent(new MouseEvent('mouseup', { ...common, buttons: 0 }))
  timeline.dispatchEvent(new MouseEvent('click', { ...common, buttons: 0 }))
}

async function scrubToStart(
  video: HTMLVideoElement,
  signal: AbortSignal,
): Promise<boolean> {
  logInfo('scrubToStart check', { currentTime: video.currentTime })
  if (video.currentTime <= RESUME_THRESHOLD_SECONDS) {
    logInfo('scrubToStart skipped; already near start')
    return false
  }

  revealControls(video)
  await wait(CONTROLS_REVEAL_MS, signal)

  const timeline = resolveTimeline()
  if (timeline === null) {
    logWarning('scrubToStart: timeline not found')
    return false
  }

  logInfo('scrubToStart: clicking timeline left edge')
  clickTimelineStart(timeline)
  return true
}

export async function seekToBeginning(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    logInfo('seekToBeginning aborted before start')
    return
  }

  logInfo('seekToBeginning start')
  try {
    const video = await waitForElement<HTMLVideoElement>(
      VIDEO_PLAYER.selectors,
      VIDEO_FIND_TIMEOUT_MS,
      document.body,
      signal,
    )
    if (video === null || signal.aborted) {
      logWarning('seekToBeginning: video not found or aborted', {
        found: video !== null,
        aborted: signal.aborted,
      })
      return
    }

    logInfo('seekToBeginning: video found', { currentTime: video.currentTime })
    // Never assign video.currentTime — live smoke produced M7375.
    await wait(SETTLE_MS, signal)
    await scrubToStart(video, signal)

    await wait(RECHECK_MS, signal)
    // Only retry when still clearly mid-episode; same absolute-left click once more.
    if (video.currentTime > RESUME_THRESHOLD_SECONDS) {
      logInfo('seekToBeginning: recheck still mid-episode', {
        currentTime: video.currentTime,
      })
      await scrubToStart(video, signal)
    }
    logInfo('seekToBeginning complete', { currentTime: video.currentTime })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logInfo('seekToBeginning aborted')
      return
    }
    throw error
  }
}
