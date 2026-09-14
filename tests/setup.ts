import { afterEach, beforeEach, vi } from 'vitest'

const chromeMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn() as unknown as typeof chrome.runtime.onMessage.addListener,
      removeListener: vi.fn() as unknown as typeof chrome.runtime.onMessage.removeListener,
    },
    onInstalled: {
      addListener: vi.fn() as unknown as typeof chrome.runtime.onInstalled.addListener,
      removeListener: vi.fn() as unknown as typeof chrome.runtime.onInstalled.removeListener,
    },
    setUninstallURL: vi.fn() as unknown as typeof chrome.runtime.setUninstallURL,
  },
  tabs: {
    query: vi.fn() as unknown as typeof chrome.tabs.query,
    sendMessage: vi.fn() as unknown as typeof chrome.tabs.sendMessage,
    create: vi.fn() as unknown as typeof chrome.tabs.create,
  },
}

beforeEach(() => {
  document.body.innerHTML = ''
  globalThis.chrome = chromeMock as unknown as typeof chrome
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
