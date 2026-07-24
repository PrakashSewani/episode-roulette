import { afterEach, describe, expect, it, vi } from 'vitest'

import { dismissToast, showErrorToast, showStatusToast } from '../../src/ui/feedback'

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

  it('shows polite status feedback and lets an error replace it', () => {
    vi.useFakeTimers()
    showStatusToast('Selected Phantom Blood, Episode 3: Youth with Dio')
    const status = document.querySelector('.ep-roulette-toast')!
    expect(status.getAttribute('role')).toBe('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect((status as HTMLElement).dataset.kind).toBe('status')

    showErrorToast('Could not open the selected episode. Try again.')
    const error = document.querySelector('.ep-roulette-toast')!
    expect(error).not.toBe(status)
    expect(error.getAttribute('role')).toBe('alert')
    expect(error.getAttribute('aria-live')).toBe('assertive')
    expect((error as HTMLElement).dataset.kind).toBe('error')
  })
})
