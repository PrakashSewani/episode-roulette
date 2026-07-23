import { afterEach, describe, expect, it, vi } from 'vitest'

import { injectButton } from '../../src/ui/button'
import { createTitleDetails } from '../fixtures/title-details'

function getButton(root: ParentNode): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>('[data-uia="random-episode-btn"]')!
}

describe('button UI', () => {
  afterEach(() => {
    document.querySelector<HTMLButtonElement>('[data-uia="random-episode-btn"]')?.remove()
  })

  it('injects ready immediately after the scoped Netflix Play button', async () => {
    const outsidePlay = document.createElement('button')
    outsidePlay.dataset.uia = 'play-button'
    document.body.append(outsidePlay)
    const root = createTitleDetails()
    document.body.append(root)
    const playButton = root.querySelector('[data-uia="play-button"]')!

    const controller = await injectButton(root, new AbortController().signal)
    const button = getButton(root)

    expect(controller).not.toBeNull()
    expect(playButton.nextElementSibling).toBe(button)
    expect(button.dataset.state).toBe('ready')
    expect(button.disabled).toBe(false)
    expect(button.getAttribute('aria-disabled')).toBe('false')
    expect(button.getAttribute('aria-label')).toBe('Random Episode')
    controller?.remove()
  })

  it('returns the existing controller for the same connected root', async () => {
    const root = createTitleDetails()
    document.body.append(root)
    const signal = new AbortController().signal

    const first = await injectButton(root, signal)
    const second = await injectButton(root, signal)

    expect(second).toBe(first)
    expect(root.querySelectorAll('[data-uia="random-episode-btn"]')).toHaveLength(1)
    first?.remove()
  })

  it('ignores clicks without a handler and while loading', async () => {
    const root = createTitleDetails()
    document.body.append(root)
    const controller = await injectButton(root, new AbortController().signal)
    const button = getButton(root)
    const handler = vi.fn()

    button.click()
    expect(button.dataset.state).toBe('ready')
    controller?.onClick(handler)
    controller?.setState('loading')
    button.click()

    expect(handler).not.toHaveBeenCalled()
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    controller?.remove()
  })

  it('keeps error enabled and transitions to loading before retry', async () => {
    const root = createTitleDetails()
    document.body.append(root)
    const controller = await injectButton(root, new AbortController().signal)
    const button = getButton(root)
    const handler = vi.fn(() => {
      expect(button.dataset.state).toBe('loading')
    })
    controller?.onClick(handler)
    controller?.setState('error', 'Could not load all seasons. Try again.')

    expect(button.disabled).toBe(false)
    expect(button.dataset.error).toBe('Could not load all seasons. Try again.')
    expect(button.getAttribute('aria-label')).toContain('Error:')
    button.click()

    expect(handler).toHaveBeenCalledOnce()
    expect(button.dataset.state).toBe('loading')
    expect(button.dataset.error).toBeUndefined()
    controller?.remove()
  })

  it('resolves null after timeout and propagates abort', async () => {
    vi.useFakeTimers()
    const root = document.createElement('div')
    document.body.append(root)
    const missing = injectButton(root, new AbortController().signal)
    vi.advanceTimersByTime(5_000)
    await expect(missing).resolves.toBeNull()

    const abortController = new AbortController()
    const aborted = injectButton(root, abortController.signal)
    abortController.abort()
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('does not let an older pending root replace a newer owned button', async () => {
    const oldRoot = document.createElement('div')
    const newRoot = createTitleDetails()
    document.body.append(oldRoot, newRoot)
    const oldController = new AbortController()
    const pendingOld = injectButton(oldRoot, oldController.signal)
    const current = await injectButton(newRoot, new AbortController().signal)

    oldRoot.innerHTML = '<div><button data-uia="play-button"></button></div>'
    await Promise.resolve()
    await Promise.resolve()

    await expect(pendingOld).resolves.toBeNull()
    expect(newRoot.querySelectorAll('[data-uia="random-episode-btn"]')).toHaveLength(1)
    expect(oldRoot.querySelector('[data-uia="random-episode-btn"]')).toBeNull()
    current?.remove()
  })
})
