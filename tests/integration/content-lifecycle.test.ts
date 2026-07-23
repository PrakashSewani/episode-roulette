import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTitleDetails } from '../fixtures/title-details'

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

const observerHarness = vi.hoisted(() => ({
  callback: null as ((event: import('../../src/types').PageChangeEvent) => void) | null,
  clearTitleObservation: vi.fn(),
  observeForTitleRoot: vi.fn(),
  observeTitleRoot: vi.fn(),
  onStop: vi.fn(),
}))

vi.mock('../../src/netflix/observer', () => ({
  clearTitleObservation: observerHarness.clearTitleObservation,
  observeForTitleRoot: observerHarness.observeForTitleRoot,
  observeTitleRoot: observerHarness.observeTitleRoot,
  onStart: vi.fn((callback: typeof observerHarness.callback) => {
    observerHarness.callback = callback
    callback?.({ type: 'route-changed', url: window.location.href })
  }),
  onStop: observerHarness.onStop,
}))

describe('Phase 2 content lifecycle', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    observerHarness.callback = null
    window.history.replaceState({}, '', '/browse')
  })

  it('waits for a unique visible validated title root', async () => {
    window.history.replaceState({}, '', '/browse?jbv=10')
    document.body.append(createTitleDetails({ hidden: true }))
    const content = await import('../../src/content')

    expect(observerHarness.observeForTitleRoot).toHaveBeenCalledTimes(1)
    expect(observerHarness.observeTitleRoot).not.toHaveBeenCalled()
    content.stop()
  })

  it('does not choose between multiple visible validated roots', async () => {
    window.history.replaceState({}, '', '/browse?jbv=11')
    document.body.append(createTitleDetails(), createTitleDetails({ metadata: true }))
    const content = await import('../../src/content')

    expect(observerHarness.observeForTitleRoot).toHaveBeenCalledTimes(1)
    expect(observerHarness.observeTitleRoot).not.toHaveBeenCalled()
    content.stop()
  })

  it('scopes observation to one valid root and injects one ready button', async () => {
    window.history.replaceState({}, '', '/browse?jbv=12')
    const root = createTitleDetails({ episodic: true })
    document.body.append(root)
    const content = await import('../../src/content')
    await flushPromises()

    expect(observerHarness.observeTitleRoot).toHaveBeenCalledWith(root, 1)
    const buttons = root.querySelectorAll<HTMLButtonElement>(
      '[data-uia="random-episode-btn"]',
    )
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.dataset.state).toBe('ready')
    buttons[0]?.click()
    expect(buttons[0]?.dataset.state).toBe('ready')
    content.stop()
  })

  it('shows spawn feedback while the scoped Play button is pending', async () => {
    window.history.replaceState({}, '', '/browse?jbv=120')
    const root = createTitleDetails({ episodic: true, metadata: true })
    document.body.append(root)
    const content = await import('../../src/content')

    const indicator = root.querySelector<HTMLButtonElement>(
      '[data-uia="random-episode-btn"]',
    )
    expect(indicator?.dataset.phase).toBe('spawn')
    expect(indicator?.dataset.state).toBe('loading')
    expect(indicator?.disabled).toBe(true)

    const container = document.createElement('div')
    const playButton = document.createElement('button')
    playButton.dataset.uia = 'play-button'
    container.append(playButton)
    root.append(container)
    await flushPromises()

    const readyButton = root.querySelector<HTMLButtonElement>(
      '[data-uia="random-episode-btn"]',
    )
    expect(playButton.nextElementSibling).toBe(readyButton)
    expect(readyButton?.dataset.phase).toBeUndefined()
    expect(readyButton?.dataset.state).toBe('ready')
    content.stop()
  })

  it('does not inject a button for an unconfirmed movie root', async () => {
    window.history.replaceState({}, '', '/browse?jbv=121')
    document.body.append(createTitleDetails())
    const content = await import('../../src/content')
    await flushPromises()

    expect(document.querySelector('[data-uia="random-episode-btn"]')).toBeNull()
    content.stop()
  })

  it('uses one absolute deadline when the same title root is replaced', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/browse?jbv=13')
    const root = createTitleDetails()
    document.body.append(root)
    const content = await import('../../src/content')
    const firstGeneration = observerHarness.observeTitleRoot.mock.calls[0]?.[1] as number

    vi.advanceTimersByTime(4_900)
    root.remove()
    const replacement = createTitleDetails()
    document.body.append(replacement)
    observerHarness.callback?.({
      type: 'title-root-removed',
      url: window.location.href,
      generation: firstGeneration,
    })

    expect(observerHarness.observeTitleRoot).toHaveBeenLastCalledWith(
      replacement,
      firstGeneration + 1,
    )
    vi.advanceTimersByTime(100)
    expect(observerHarness.clearTitleObservation).toHaveBeenCalled()
    content.stop()
  })

  it('invalidates a confirmed context when its root is removed after the deadline', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/browse?jbv=131')
    const root = createTitleDetails({ episodic: true })
    document.body.append(root)
    const content = await import('../../src/content')
    const generation = observerHarness.observeTitleRoot.mock.calls[0]?.[1] as number

    vi.advanceTimersByTime(5_100)
    root.remove()
    observerHarness.callback?.({
      type: 'title-root-removed',
      url: window.location.href,
      generation,
    })

    expect(observerHarness.clearTitleObservation).toHaveBeenCalled()
    expect(observerHarness.observeForTitleRoot).not.toHaveBeenCalled()
    content.stop()
  })

  it('ignores stale generation DOM events after direct title navigation', async () => {
    window.history.replaceState({}, '', '/browse?jbv=14')
    document.body.append(createTitleDetails())
    const content = await import('../../src/content')
    const oldGeneration = observerHarness.observeTitleRoot.mock.calls[0]?.[1] as number

    window.history.replaceState({}, '', '/browse?jbv=15')
    observerHarness.callback?.({ type: 'route-changed', url: window.location.href })
    const callsAfterNavigation = observerHarness.observeTitleRoot.mock.calls.length
    observerHarness.callback?.({
      type: 'title-dom-changed',
      url: window.location.href,
      generation: oldGeneration,
    })

    expect(observerHarness.observeTitleRoot).toHaveBeenCalledTimes(callsAfterNavigation)
    content.stop()
  })

  it('reattaches scoped observation for a same-title URL change', async () => {
    window.history.replaceState({}, '', '/browse?jbv=16')
    const root = createTitleDetails({ episodic: true })
    document.body.append(root)
    const content = await import('../../src/content')
    const generation = observerHarness.observeTitleRoot.mock.calls[0]?.[1] as number

    window.history.replaceState({}, '', '/genre/83?jbv=16#details')
    observerHarness.callback?.({ type: 'route-changed', url: window.location.href })

    expect(observerHarness.observeTitleRoot).toHaveBeenLastCalledWith(root, generation)
    content.stop()
  })

  it('removes button and feedback when the title context closes', async () => {
    window.history.replaceState({}, '', '/browse?jbv=17')
    document.body.append(createTitleDetails({ episodic: true }))
    const content = await import('../../src/content')
    const { showErrorToast } = await import('../../src/ui/feedback')
    await flushPromises()
    showErrorToast('Something went wrong. Try again.')

    expect(document.querySelector('[data-uia="random-episode-btn"]')).not.toBeNull()
    expect(document.querySelector('.ep-roulette-toast')).not.toBeNull()
    window.history.replaceState({}, '', '/browse')
    observerHarness.callback?.({ type: 'route-changed', url: window.location.href })

    expect(document.querySelector('[data-uia="random-episode-btn"]')).toBeNull()
    expect(document.querySelector('.ep-roulette-toast')).toBeNull()
    content.stop()
  })

  it('injects styles once and removes them on stop', async () => {
    const content = await import('../../src/content')

    content.start()
    expect(document.querySelectorAll('#ep-roulette-styles')).toHaveLength(1)
    content.stop()
    expect(document.getElementById('ep-roulette-styles')).toBeNull()
  })
})
