import { describe, expect, it, vi } from 'vitest'

import { resilientQuery, waitForElement } from '../../src/netflix/dom-utils'

async function flushMutations(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('DOM utilities', () => {
  it('returns the first match from the ordered selector list', () => {
    document.body.innerHTML = '<div id="second"></div><div id="first"></div>'

    expect(resilientQuery(['#first', '#second'])?.id).toBe('first')
  })

  it('waits within the supplied root and ignores outside matches', async () => {
    vi.useFakeTimers()
    const root = document.createElement('div')
    document.body.append(root)
    document.body.insertAdjacentHTML('beforeend', '<button data-uia="play-button"></button>')
    const controller = new AbortController()
    const result = waitForElement<HTMLElement>(
      ['[data-uia="play-button"]'],
      5_000,
      root,
      controller.signal,
    )

    root.innerHTML = '<button data-uia="play-button" id="scoped"></button>'
    await flushMutations()

    await expect(result).resolves.toHaveProperty('id', 'scoped')
  })

  it('resolves null after the timeout', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const result = waitForElement(['.missing'], 5_000, document.body, controller.signal)

    vi.advanceTimersByTime(5_000)

    await expect(result).resolves.toBeNull()
  })

  it('rejects with AbortError and cleans up the wait', async () => {
    const controller = new AbortController()
    const result = waitForElement(['.missing'], 5_000, document.body, controller.signal)

    controller.abort()

    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  })
})
