import { afterEach, describe, expect, it, vi } from 'vitest'

import { dismissToast, showErrorToast } from '../../src/ui/feedback'

describe('error feedback', () => {
  afterEach(() => dismissToast())

  it('uses the five-second default plus exit animation', () => {
    vi.useFakeTimers()
    showErrorToast('Something went wrong. Try again.')
    const toast = document.querySelector('.ep-roulette-toast')!

    vi.advanceTimersByTime(4_999)
    expect(toast.isConnected).toBe(true)
    vi.advanceTimersByTime(1)
    expect(toast.classList.contains('ep-roulette-toast-exit')).toBe(true)
    vi.advanceTimersByTime(300)
    expect(toast.isConnected).toBe(false)
  })

  it('replaces an existing toast and protects the new toast from stale timers', () => {
    vi.useFakeTimers()
    showErrorToast('First', 1_000)
    vi.advanceTimersByTime(500)
    showErrorToast('Second', 5_000)

    vi.advanceTimersByTime(800)
    expect(document.querySelector('.ep-roulette-toast')?.textContent).toBe('Second')
    vi.advanceTimersByTime(4_200)
    expect(document.querySelector('.ep-roulette-toast-exit')?.textContent).toBe('Second')
  })

  it('dismisses the current toast immediately', () => {
    vi.useFakeTimers()
    showErrorToast('Retry me')

    dismissToast()

    expect(document.querySelector('.ep-roulette-toast')).toBeNull()
    vi.runAllTimers()
    expect(document.querySelector('.ep-roulette-toast')).toBeNull()
  })
})
