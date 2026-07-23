import type { PageChangeCallback, PageChangeEvent } from '../types'

const URL_POLL_INTERVAL_MS = 500
const DOM_DEBOUNCE_MS = 50

let callback: PageChangeCallback | null = null
let lastUrl = ''
let pollTimer: number | null = null
let discoveryObserver: MutationObserver | null = null
let titleObserver: MutationObserver | null = null
let livenessObserver: MutationObserver | null = null
let debounceTimer: number | null = null
let observationGeneration: number | null = null

function emit(event: PageChangeEvent): void {
  callback?.(event)
}

function evaluateUrl(): void {
  const url = window.location.href
  if (url === lastUrl) {
    return
  }

  lastUrl = url
  clearTitleObservation()
  emit({ type: 'route-changed', url })
}

function clearDebounce(): void {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function queueDomChange(generation: number): void {
  clearDebounce()
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null
    if (observationGeneration !== generation) {
      return
    }

    emit({
      type: 'title-dom-changed',
      url: window.location.href,
      generation,
    })
  }, DOM_DEBOUNCE_MS)
}

function disconnectTitleObservers(): void {
  discoveryObserver?.disconnect()
  discoveryObserver = null
  titleObserver?.disconnect()
  titleObserver = null
  livenessObserver?.disconnect()
  livenessObserver = null
  clearDebounce()
}

export function onStart(pageChangeCallback: PageChangeCallback): void {
  if (callback !== null) {
    callback = pageChangeCallback
    return
  }

  callback = pageChangeCallback
  lastUrl = ''
  window.addEventListener('popstate', evaluateUrl)
  window.addEventListener('hashchange', evaluateUrl)
  pollTimer = window.setInterval(evaluateUrl, URL_POLL_INTERVAL_MS)
  evaluateUrl()
}

export function observeForTitleRoot(generation: number): void {
  disconnectTitleObservers()
  observationGeneration = generation

  if (document.body === null) {
    return
  }

  discoveryObserver = new MutationObserver(() => queueDomChange(generation))
  discoveryObserver.observe(document.body, { childList: true, subtree: true })
}

export function observeTitleRoot(root: HTMLElement, generation: number): void {
  disconnectTitleObservers()
  observationGeneration = generation
  const expectedParent = root.parentElement

  titleObserver = new MutationObserver(() => queueDomChange(generation))
  titleObserver.observe(root, { childList: true, subtree: true })

  if (document.body === null) {
    return
  }

  livenessObserver = new MutationObserver(() => {
    if (observationGeneration !== generation) {
      return
    }

    if (!root.isConnected || root.parentElement !== expectedParent) {
      disconnectTitleObservers()
      observationGeneration = null
      emit({
        type: 'title-root-removed',
        url: window.location.href,
        generation,
      })
    }
  })
  livenessObserver.observe(document.body, { childList: true, subtree: true })
}

export function clearTitleObservation(): void {
  disconnectTitleObservers()
  observationGeneration = null
}

export function onStop(): void {
  clearTitleObservation()

  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }

  window.removeEventListener('popstate', evaluateUrl)
  window.removeEventListener('hashchange', evaluateUrl)
  callback = null
  lastUrl = ''
}
