import { beforeEach, describe, expect, it, vi } from 'vitest'

import { playEpisode } from '../../src/engine/navigator'
import type { Episode } from '../../src/types'

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    seriesId: '1',
    seasonKey: 'implicit',
    seasonLabel: 'Episodes',
    seasonNumber: null,
    episodeIndex: 0,
    episodeNumber: 1,
    title: 'Pilot',
    discoveredSeasonEpisodeCount: 1,
    ...overrides,
  }
}

function createFixture({ duplicateSelector = false } = {}): {
  root: HTMLElement
  selector: HTMLElement
  row: HTMLElement
} {
  const root = document.createElement('div')
  const selector = document.createElement('div')
  selector.dataset.uia = 'episode-selector'
  const row = document.createElement('div')
  row.dataset.uia = 'titleCard--container'
  row.setAttribute('role', 'button')
  row.setAttribute('aria-label', 'Pilot')
  row.innerHTML = '<span data-uia="episode-number">E1</span>'
  selector.append(row)
  root.append(selector)
  if (duplicateSelector) {
    const duplicate = selector.cloneNode(true)
    root.append(duplicate)
  }
  document.body.append(root)
  return { root, selector, row }
}

describe('playEpisode', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => (
      window.setTimeout(() => callback(performance.now()), 0)
    ))
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      window.clearTimeout(id)
    })
  })

  it('resolves and clicks exactly one matching live row', async () => {
    const { root, row } = createFixture()
    const click = vi.spyOn(row, 'click')
    const assertCurrent = vi.fn()

    await playEpisode(episode(), root, new AbortController().signal, assertCurrent)

    expect(assertCurrent).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
  })

  it('uses a replacement episode selector after switching seasons', async () => {
    const root = document.createElement('div')
    const initial = document.createElement('div')
    initial.dataset.uia = 'episode-selector'
    const toggle = document.createElement('button')
    toggle.dataset.uia = 'dropdown-toggle'
    toggle.setAttribute('aria-haspopup', 'true')
    toggle.textContent = 'Season 1'
    initial.append(toggle)
    const initialRow = document.createElement('div')
    initialRow.dataset.uia = 'titleCard--container'
    initialRow.setAttribute('role', 'button')
    initialRow.setAttribute('aria-label', 'Old')
    initial.append(initialRow)
    root.append(initial)
    document.body.append(root)

    const replacementClick = vi.fn()
    toggle.addEventListener('click', () => {
      const menu = document.createElement('div')
      menu.dataset.uia = 'dropdown-menu'
      menu.setAttribute('role', 'menu')
      const item = document.createElement('button')
      item.dataset.uia = 'dropdown-menu-item'
      item.setAttribute('role', 'menuitem')
      item.textContent = 'Season 2\n(1 Episode)'
      item.addEventListener('click', () => {
        menu.remove()
        const replacement = document.createElement('div')
        replacement.dataset.uia = 'episode-selector'
        const nextToggle = document.createElement('button')
        nextToggle.dataset.uia = 'dropdown-toggle'
        nextToggle.setAttribute('aria-haspopup', 'true')
        nextToggle.textContent = 'Season 2'
        const replacementRow = document.createElement('div')
        replacementRow.dataset.uia = 'titleCard--container'
        replacementRow.setAttribute('role', 'button')
        replacementRow.setAttribute('aria-label', 'Selected')
        replacementRow.innerHTML = '<span data-uia="episode-number">E1</span>'
        replacementRow.addEventListener('click', replacementClick)
        replacement.append(nextToggle, replacementRow)
        initial.replaceWith(replacement)
      })
      menu.append(item)
      root.append(menu)
    })

    await playEpisode(
      episode({
        seasonKey: 'season 2', seasonLabel: 'Season 2', seasonNumber: 2,
        title: 'Selected', discoveredSeasonEpisodeCount: 1,
      }),
      root,
      new AbortController().signal,
      vi.fn(),
    )

    expect(replacementClick).toHaveBeenCalledOnce()
  })

  it('rejects missing or ambiguous selectors without clicking', async () => {
    const missing = document.createElement('div')
    document.body.append(missing)
    await expect(playEpisode(
      episode(), missing, new AbortController().signal, vi.fn(),
    )).rejects.toMatchObject({ name: 'PlaybackResolutionError' })

    const { root } = createFixture({ duplicateSelector: true })
    await expect(playEpisode(
      episode(), root, new AbortController().signal, vi.fn(),
    )).rejects.toMatchObject({ name: 'PlaybackResolutionError' })
  })

  it('distinguishes live count mismatch from ordinary resolution failure', async () => {
    const mismatch = createFixture()
    const secondRow = mismatch.row.cloneNode(true)
    mismatch.selector.append(secondRow)
    await expect(playEpisode(
      episode({ discoveredSeasonEpisodeCount: 3 }),
      mismatch.root,
      new AbortController().signal,
      vi.fn(),
    )).rejects.toMatchObject({ name: 'CacheValidationMismatchError' })

    const unresolved = createFixture()
    await expect(playEpisode(
      episode({ title: 'Missing', episodeNumber: 9 }),
      unresolved.root,
      new AbortController().signal,
      vi.fn(),
    )).rejects.toMatchObject({ name: 'PlaybackResolutionError' })
  })

  it('prevents the final click when aborted or stale', async () => {
    const abortedFixture = createFixture()
    const abortedClick = vi.spyOn(abortedFixture.row, 'click')
    const controller = new AbortController()
    controller.abort()
    await expect(playEpisode(
      episode(), abortedFixture.root, controller.signal, vi.fn(),
    )).rejects.toMatchObject({ name: 'AbortError' })
    expect(abortedClick).not.toHaveBeenCalled()

    const staleFixture = createFixture()
    const staleClick = vi.spyOn(staleFixture.row, 'click')
    await expect(playEpisode(
      episode(),
      staleFixture.root,
      new AbortController().signal,
      () => { throw new DOMException('Stale', 'AbortError') },
    )).rejects.toMatchObject({ name: 'AbortError' })
    expect(staleClick).not.toHaveBeenCalled()
  })
})
