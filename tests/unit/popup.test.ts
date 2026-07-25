import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PopupMessageResponse } from '../../src/types'

function setupDom(): void {
  document.body.innerHTML = `
    <p class="ep-roulette-status" id="status">Checking Netflix...</p>
    <button class="ep-roulette-roll" id="roll" disabled>
      <span class="ep-roulette-roll-icon">dice</span>
      <span class="ep-roulette-roll-text">Roll Random Episode</span>
    </button>
  `
}

function mockTabsResponse(response: PopupMessageResponse | null): void {
  const tabQuery = chrome.tabs.query as unknown as ReturnType<typeof vi.fn>
  const tabSend = chrome.tabs.sendMessage as unknown as ReturnType<typeof vi.fn>
  tabQuery.mockResolvedValue([{ id: 1 }] as unknown as chrome.tabs.Tab[])
  tabSend.mockResolvedValue(response)
}

async function importPopup(): Promise<void> {
  await import('../../src/popup/popup')
  await Promise.resolve()
  await Promise.resolve()
}

describe('popup', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setupDom()
  })

  it('shows no-series when content script does not respond', async () => {
    const tabQuery = chrome.tabs.query as unknown as ReturnType<typeof vi.fn>
    const tabSend = chrome.tabs.sendMessage as unknown as ReturnType<typeof vi.fn>
    tabQuery.mockResolvedValue([{ id: 1 }] as unknown as chrome.tabs.Tab[])
    tabSend.mockRejectedValue(new Error('no content script'))

    await importPopup()

    const status = document.getElementById('status')!
    const roll = document.getElementById('roll') as HTMLButtonElement
    expect(status.textContent).toContain('Open a Netflix TV series')
    expect(roll.disabled).toBe(true)
  })

  it('shows ready when content script responds with ready status', async () => {
    mockTabsResponse({ type: 'status', status: 'ready' })

    await importPopup()

    const status = document.getElementById('status')!
    const roll = document.getElementById('roll') as HTMLButtonElement
    expect(status.textContent).toContain('Series detected')
    expect(roll.disabled).toBe(false)
  })

  it('shows loading state with spinning dice when status is loading', async () => {
    mockTabsResponse({ type: 'status', status: 'loading' })

    await importPopup()

    const roll = document.getElementById('roll') as HTMLButtonElement
    expect(roll.disabled).toBe(true)
    expect(roll.classList.contains('rolling')).toBe(true)
  })

  it('shows error state with enabled roll button', async () => {
    mockTabsResponse({ type: 'status', status: 'error' })

    await importPopup()

    const status = document.getElementById('status')!
    const roll = document.getElementById('roll') as HTMLButtonElement
    expect(status.textContent).toContain('failed')
    expect(roll.disabled).toBe(false)
  })

  it('sends roll message and closes popup on roll-accepted', async () => {
    mockTabsResponse({ type: 'status', status: 'ready' })

    await importPopup()

    const tabSend = chrome.tabs.sendMessage as unknown as ReturnType<typeof vi.fn>
    tabSend.mockResolvedValue({ type: 'roll-accepted' } as PopupMessageResponse)
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
    const roll = document.getElementById('roll') as HTMLButtonElement
    roll.click()

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(closeSpy).toHaveBeenCalledOnce()

    const sentMessages = tabSend.mock.calls.map((call) => call[1])
    expect(sentMessages).toContainEqual({ type: 'roll' })
  })

  it('stays no-series on roll-rejected', async () => {
    mockTabsResponse({ type: 'status', status: 'ready' })

    await importPopup()

    const tabSend = chrome.tabs.sendMessage as unknown as ReturnType<typeof vi.fn>
    tabSend.mockResolvedValue({ type: 'roll-rejected', reason: 'no-series' } as PopupMessageResponse)
    const roll = document.getElementById('roll') as HTMLButtonElement
    roll.click()

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const status = document.getElementById('status')!
    expect(status.textContent).toContain('Open a Netflix TV series')
  })
})
