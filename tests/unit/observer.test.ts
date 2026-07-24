import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearTitleObservation,
  observeForTitleRoot,
  observeTitleRoot,
  onStart,
  onStop,
} from '../../src/netflix/observer'
import type { PageChangeEvent } from '../../src/types'

async function flushMutations(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('SPA observer', () => {
  afterEach(() => onStop())

  it('emits the initial route and detects same-path jbv changes by polling', () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/browse?jbv=1')
    const events: PageChangeEvent[] = []

    onStart((event) => events.push(event))
    window.history.replaceState({}, '', '/browse?jbv=2')
    vi.advanceTimersByTime(500)

    expect(events).toEqual([
      { type: 'route-changed', url: 'http://localhost:3000/browse?jbv=1' },
      { type: 'route-changed', url: 'http://localhost:3000/browse?jbv=2' },
    ])
  })

  it('evaluates routes immediately for history events', () => {
    vi.useFakeTimers()
    const events: PageChangeEvent[] = []
    onStart((event) => events.push(event))
    events.length = 0

    window.history.replaceState({}, '', '/title/20')
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.history.replaceState({}, '', '/title/21#episodes')
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    expect(events).toEqual([
      { type: 'route-changed', url: 'http://localhost:3000/title/20' },
      { type: 'route-changed', url: 'http://localhost:3000/title/21#episodes' },
    ])
  })

  it('debounces discovery mutations and clears stale notifications', async () => {
    vi.useFakeTimers()
    const events: PageChangeEvent[] = []
    onStart((event) => events.push(event))
    events.length = 0

    observeForTitleRoot(4)
    document.body.append(document.createElement('div'))
    await flushMutations()
    clearTitleObservation()
    vi.advanceTimersByTime(50)

    expect(events).toEqual([])
  })

  it('emits one debounced scoped DOM event for a mutation burst', async () => {
    vi.useFakeTimers()
    const events: PageChangeEvent[] = []
    const root = document.createElement('div')
    document.body.append(root)
    onStart((event) => events.push(event))
    events.length = 0

    observeTitleRoot(root, 7)
    root.append(document.createElement('div'), document.createElement('span'))
    await flushMutations()
    vi.advanceTimersByTime(50)

    expect(events).toEqual([{
      type: 'title-dom-changed',
      url: window.location.href,
      generation: 7,
    }])
  })

  it.each(['direct', 'ancestor'] as const)('detects %s root removal', async (kind) => {
    const events: PageChangeEvent[] = []
    const parent = document.createElement('div')
    const root = document.createElement('div')
    parent.append(root)
    document.body.append(parent)
    onStart((event) => events.push(event))
    events.length = 0

    observeTitleRoot(root, 8)
    if (kind === 'direct') root.remove()
    else parent.remove()
    await flushMutations()

    expect(events).toEqual([{
      type: 'title-root-removed',
      url: window.location.href,
      generation: 8,
    }])
  })

  it('keeps route polling active when title observation is cleared', () => {
    vi.useFakeTimers()
    const events: PageChangeEvent[] = []
    onStart((event) => events.push(event))
    events.length = 0
    observeForTitleRoot(1)
    clearTitleObservation()

    window.history.replaceState({}, '', '/title/42')
    vi.advanceTimersByTime(500)

    expect(events).toEqual([{
      type: 'route-changed',
      url: 'http://localhost:3000/title/42',
    }])
  })
})
