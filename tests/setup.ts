import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ''
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (!this.isConnected || this.hidden || this.dataset.testHidden === 'true') {
      return [] as unknown as DOMRectList
    }

    return [{ width: 1, height: 1 }] as unknown as DOMRectList
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
