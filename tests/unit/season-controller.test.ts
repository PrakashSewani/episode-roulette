import { describe, expect, it, vi } from 'vitest'

import {
  activateSeason,
  enumerateSeasons,
  expandAndValidateSeason,
  getActiveSeasonKey,
  getValidEpisodeRows,
} from '../../src/netflix/season-controller'

function appendRow(root: HTMLElement, title: string): HTMLElement {
  const row = document.createElement('div')
  row.dataset.uia = 'titleCard--container'
  row.setAttribute('role', 'button')
  row.setAttribute('aria-label', title)
  root.append(row)
  return row
}

function createDropdownFixture(): {
  root: HTMLElement
  episodeSelector: HTMLElement
  toggle: HTMLButtonElement
} {
  const root = document.createElement('div')
  const episodeSelector = document.createElement('div')
  episodeSelector.dataset.uia = 'episode-selector'
  const toggle = document.createElement('button')
  toggle.dataset.uia = 'dropdown-toggle'
  toggle.setAttribute('aria-haspopup', 'true')
  toggle.textContent = 'Season 1'
  episodeSelector.append(toggle)
  appendRow(episodeSelector, 'One')
  root.append(episodeSelector)
  document.body.append(root)

  toggle.addEventListener('click', () => {
    const existing = root.querySelector('[data-uia="dropdown-menu"]')
    if (existing !== null) {
      existing.remove()
      toggle.setAttribute('aria-expanded', 'false')
      return
    }
    const menu = document.createElement('div')
    menu.dataset.uia = 'dropdown-menu'
    menu.setAttribute('role', 'menu')
    for (const [label, count] of [['Season 1', '1 Episode'], ['Season 2', '2 Episodes']]) {
      const item = document.createElement('button')
      item.dataset.uia = 'dropdown-menu-item'
      item.setAttribute('role', 'menuitem')
      item.textContent = `${label}\n(${count})`
      item.addEventListener('click', () => {
        toggle.textContent = label
        menu.remove()
        for (const row of getValidEpisodeRows(episodeSelector)) row.remove()
        appendRow(episodeSelector, `${label} A`)
        if (label === 'Season 2') appendRow(episodeSelector, `${label} B`)
      })
      menu.append(item)
    }
    const action = document.createElement('button')
    action.dataset.uia = 'dropdown-menu-item'
    action.setAttribute('role', 'menuitem')
    action.textContent = 'See All Episodes'
    menu.append(action)
    root.append(menu)
    toggle.setAttribute('aria-expanded', 'true')
  })

  return { root, episodeSelector, toggle }
}

describe('getValidEpisodeRows', () => {
  it('returns only connected, visible episode buttons', () => {
    document.body.innerHTML = `
      <div id="episodes">
        <div data-uia="titleCard--container" role="button" id="valid"></div>
        <div data-uia="titleCard--container" role="button" id="hidden" data-test-hidden="true"></div>
        <div data-uia="titleCard--container" id="wrong-role"></div>
      </div>
    `

    const root = document.querySelector('#episodes')!
    expect(getValidEpisodeRows(root).map((row) => row.id)).toEqual(['valid'])
  })

  it('rejects rows in a disconnected episode selector', () => {
    const root = document.createElement('div')
    root.innerHTML = '<div data-uia="titleCard--container" role="button"></div>'

    expect(getValidEpisodeRows(root)).toEqual([])
  })
})

describe('season control', () => {
  it('enumerates one implicit season without a supported control', async () => {
    const episodeSelector = document.createElement('div')
    document.body.append(episodeSelector)
    appendRow(episodeSelector, 'One')

    await expect(enumerateSeasons(
      document.body,
      episodeSelector,
      performance.now() + 5_000,
      new AbortController().signal,
    )).resolves.toEqual([{
      key: 'implicit', label: 'Episodes', seasonNumber: null,
      expectedEpisodeCount: null,
    }])
    expect(getActiveSeasonKey(episodeSelector)).toBe('implicit')
  })

  it('enumerates strict English dropdown seasons and closes the menu', async () => {
    const { root, episodeSelector } = createDropdownFixture()
    const seasons = await enumerateSeasons(
      root,
      episodeSelector,
      performance.now() + 5_000,
      new AbortController().signal,
    )

    expect(seasons).toEqual([
      { key: 'season 1', label: 'Season 1', seasonNumber: 1, expectedEpisodeCount: 1 },
      { key: 'season 2', label: 'Season 2', seasonNumber: 2, expectedEpisodeCount: 2 },
    ])
    expect(root.querySelector('[data-uia="dropdown-menu"]')).toBeNull()
  })

  it('rejects unsupported selectable labels and duplicate keys', async () => {
    const { root, episodeSelector, toggle } = createDropdownFixture()
    toggle.click()
    const menu = root.querySelector('[data-uia="dropdown-menu"]')!
    const unsupported = document.createElement('button')
    unsupported.dataset.uia = 'dropdown-menu-item'
    unsupported.setAttribute('role', 'menuitem')
    unsupported.textContent = 'Specials'
    menu.append(unsupported)

    await expect(enumerateSeasons(
      root, episodeSelector, performance.now() + 5_000,
      new AbortController().signal,
    )).rejects.toMatchObject({ reason: 'unsupported-layout' })
  })

  it('does not click an already-active season and verifies switched content', async () => {
    const { root, episodeSelector, toggle } = createDropdownFixture()
    const clickSpy = vi.spyOn(toggle, 'click')
    await activateSeason(
      root,
      episodeSelector,
      { key: 'season 1', label: 'Season 1', seasonNumber: 1, expectedEpisodeCount: 1 },
      performance.now() + 5_000,
      new AbortController().signal,
    )
    expect(clickSpy).not.toHaveBeenCalled()

    await activateSeason(
      root,
      episodeSelector,
      { key: 'season 2', label: 'Season 2', seasonNumber: 2, expectedEpisodeCount: 2 },
      performance.now() + 5_000,
      new AbortController().signal,
    )
    expect(getActiveSeasonKey(episodeSelector)).toBe('season 2')
    expect(getValidEpisodeRows(episodeSelector)).toHaveLength(2)
  })

  it('expands once, waits for stable rows, and enforces exact counts', async () => {
    const episodeSelector = document.createElement('div')
    document.body.append(episodeSelector)
    appendRow(episodeSelector, 'One')
    const expand = document.createElement('button')
    expand.dataset.uia = 'section-expand'
    episodeSelector.append(expand)
    const clickSpy = vi.spyOn(expand, 'click')
    expand.addEventListener('click', () => {
      expand.remove()
      appendRow(episodeSelector, 'Two')
    })

    await expect(expandAndValidateSeason(
      episodeSelector,
      { key: 'season 1', label: 'Season 1', seasonNumber: 1, expectedEpisodeCount: 2 },
      performance.now() + 5_000,
      new AbortController().signal,
    )).resolves.toHaveLength(2)
    expect(clickSpy).toHaveBeenCalledOnce()

    await expect(expandAndValidateSeason(
      episodeSelector,
      { key: 'season 1', label: 'Season 1', seasonNumber: 1, expectedEpisodeCount: 3 },
      performance.now() + 5_000,
      new AbortController().signal,
    )).rejects.toMatchObject({ reason: 'count-mismatch' })
  })
})
