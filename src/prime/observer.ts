import type { PageChangeCallback } from '../types'

let callback: PageChangeCallback | null = null
let lastUrl = ''
let routeTimer: number | null = null
let bodyObserver: MutationObserver | null = null
let rootObserver: MutationObserver | null = null
let generation: number | null = null

function evaluate(): void {
  const url = window.location.href
  if (url === lastUrl) return
  lastUrl = url
  callback?.({ type: 'route-changed', url })
}

function emitDomChange(): void {
  if (generation === null) return
  callback?.({ type: 'title-dom-changed', url: window.location.href, generation })
}

export function start(next: PageChangeCallback): void {
  callback = next
  if (routeTimer !== null) return
  lastUrl = ''
  routeTimer = window.setInterval(evaluate, 500)
  evaluate()
}

export function observeForTitleRoot(nextGeneration: number): void {
  clearObservation()
  generation = nextGeneration
  if (document.body === null) return
  bodyObserver = new MutationObserver(emitDomChange)
  bodyObserver.observe(document.body, { childList: true, subtree: true })
}

export function observeTitleRoot(root: HTMLElement, nextGeneration: number): void {
  clearObservation()
  generation = nextGeneration
  rootObserver = new MutationObserver(emitDomChange)
  rootObserver.observe(root, { childList: true, subtree: true })
  if (document.body !== null) {
    bodyObserver = new MutationObserver(() => {
      if (!root.isConnected) {
        clearObservation()
        callback?.({ type: 'title-root-removed', url: window.location.href, generation: nextGeneration })
      }
    })
    bodyObserver.observe(document.body, { childList: true, subtree: true })
  }
}

export function clearObservation(): void {
  bodyObserver?.disconnect()
  bodyObserver = null
  rootObserver?.disconnect()
  rootObserver = null
  generation = null
}

export function stop(): void {
  clearObservation()
  if (routeTimer !== null) window.clearInterval(routeTimer)
  routeTimer = null
  callback = null
  lastUrl = ''
}
