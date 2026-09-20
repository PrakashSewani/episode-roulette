import { afterEach, describe, expect, it, vi } from 'vitest'

import { dismissToast, showErrorToast, showStatusToast } from '../../src/ui/feedback'

const REPORT_ACTION = {
  label: 'Report',
  href: 'https://episode-roulette.prakashsewani.com/report?code=discovery&provider=netflix',
}

describe('error feedback', () => {
  afterEach(() => dismissToast())

  it('uses the five-second default plus exit animation when no action is attached', () => {
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
    showErrorToast('First', { duration: 1_000 })
    vi.advanceTimersByTime(500)
    showErrorToast('Second', { duration: 5_000 })

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
    expect(status.querySelector('.ep-roulette-toast-action')).toBeNull()
    expect(status.querySelector('.ep-roulette-toast-close')).toBeNull()

    showErrorToast('Could not open the selected episode. Try again.')
    const error = document.querySelector('.ep-roulette-toast')!
    expect(error).not.toBe(status)
    expect(error.getAttribute('role')).toBe('alert')
    expect(error.getAttribute('aria-live')).toBe('assertive')
    expect((error as HTMLElement).dataset.kind).toBe('error')
  })

  it('renders the report action as a new-tab link', () => {
    showErrorToast('Could not load all seasons. Try again.', { action: REPORT_ACTION })

    const link = document.querySelector<HTMLAnchorElement>('.ep-roulette-toast-action')!
    expect(link.textContent).toBe('Report')
    expect(link.getAttribute('href')).toBe(REPORT_ACTION.href)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(document.querySelector('.ep-roulette-toast-close')).not.toBeNull()
  })

  it('keeps an action snackbar on screen until it is dismissed', () => {
    vi.useFakeTimers()
    showErrorToast('Could not load all seasons. Try again.', { action: REPORT_ACTION })
    const toast = document.querySelector('.ep-roulette-toast')!

    vi.advanceTimersByTime(60_000)

    expect(toast.isConnected).toBe(true)
    expect(toast.classList.contains('ep-roulette-toast-exit')).toBe(false)
    expect(document.querySelector('.ep-roulette-toast-close')).not.toBeNull()
  })

  it('dismisses the snackbar when the close button is clicked', () => {
    showErrorToast('No episodes found', { action: REPORT_ACTION })

    document.querySelector<HTMLButtonElement>('.ep-roulette-toast-close')!.click()

    expect(document.querySelector('.ep-roulette-toast')).toBeNull()
  })

  it('dismisses the snackbar when the report link is activated', () => {
    showErrorToast('Could not load all seasons. Try again.', { action: REPORT_ACTION })
    const link = document.querySelector<HTMLAnchorElement>('.ep-roulette-toast-action')!
    link.addEventListener('click', (event) => event.preventDefault())

    link.click()

    expect(document.querySelector('.ep-roulette-toast')).toBeNull()
  })

  it('renders the message and action label as text, never as markup', () => {
    showErrorToast('<img src=x onerror="alert(1)">', {
      action: { label: '<b>Report</b>', href: 'https://example.test/report' },
    })

    const toast = document.querySelector<HTMLElement>('.ep-roulette-toast')!
    expect(toast.querySelector('img')).toBeNull()
    expect(toast.querySelector('.ep-roulette-toast-text')?.textContent)
      .toBe('<img src=x onerror="alert(1)">')
    expect(toast.querySelector('.ep-roulette-toast-action')?.textContent).toBe('<b>Report</b>')
  })
})
