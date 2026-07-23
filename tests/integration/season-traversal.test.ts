import { beforeEach, describe, expect, it, vi } from 'vitest'

import { discoverEpisodes } from '../../src/discovery/season-traverser'

function appendRow(root: HTMLElement, title: string, number: number): void {
  const row = document.createElement('div')
  row.dataset.uia = 'titleCard--container'
  row.setAttribute('role', 'button')
  row.setAttribute('aria-label', title)
  row.innerHTML = `<span data-uia="episode-number">E${number}</span>`
  root.append(row)
}

function createImplicitFixture(): HTMLElement {
  const root = document.createElement('div')
  const selector = document.createElement('div')
  selector.dataset.uia = 'episode-selector'
  appendRow(selector, 'Pilot', 1)
  appendRow(selector, 'Second', 2)
  root.append(selector)
  document.body.append(root)
  return root
}

function createDropdownFixture({ seasonTwoMenuFailures = 0 } = {}): HTMLElement {
  const root = document.createElement('div')
  const selector = document.createElement('div')
  selector.dataset.uia = 'episode-selector'
  const toggle = document.createElement('button')
  toggle.dataset.uia = 'dropdown-toggle'
  toggle.setAttribute('aria-haspopup', 'true')
  toggle.textContent = 'Season 1'
  selector.append(toggle)
  appendRow(selector, 'S1 A', 1)
  root.append(selector)
  document.body.append(root)
  let menusOpened = 0

  toggle.addEventListener('click', () => {
    const openMenu = root.querySelector('[data-uia="dropdown-menu"]')
    if (openMenu !== null) {
      openMenu.remove()
      return
    }
    const menu = document.createElement('div')
    menusOpened += 1
    menu.dataset.uia = 'dropdown-menu'
    menu.setAttribute('role', 'menu')
    for (const [season, count] of [[1, 1], [2, 2]]) {
      if (season === 2 && menusOpened > 1 && seasonTwoMenuFailures > 0) {
        seasonTwoMenuFailures -= 1
        continue
      }
      const item = document.createElement('button')
      item.dataset.uia = 'dropdown-menu-item'
      item.setAttribute('role', 'menuitem')
      item.textContent = `Season ${season}\n(${count} Episode${count === 1 ? '' : 's'})`
      item.addEventListener('click', () => {
        menu.remove()
        toggle.textContent = `Season ${season}`
        for (const row of selector.querySelectorAll('[data-uia="titleCard--container"]')) {
          row.remove()
        }
        appendRow(selector, `S${season} A`, 1)
        if (season === 2) appendRow(selector, 'S2 B', 2)
      })
      menu.append(item)
    }
    root.append(menu)
  })
  return root
}

describe('season traversal', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => (
      window.setTimeout(() => callback(performance.now()), 0)
    ))
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      window.clearTimeout(id)
    })
  })

  it('collects one complete implicit season with durable metadata', async () => {
    const result = await discoverEpisodes(
      '10',
      createImplicitFixture(),
      new AbortController().signal,
    )

    expect(result.totalSeasons).toBe(1)
    expect(result.episodes).toHaveLength(2)
    expect(result.episodes.map((episode) => episode.seasonKey)).toEqual([
      'implicit', 'implicit',
    ])
  })

  it('collects every explicit season sequentially', async () => {
    const result = await discoverEpisodes(
      '20',
      createDropdownFixture(),
      new AbortController().signal,
    )

    expect(result.totalSeasons).toBe(2)
    expect(result.episodes.map((episode) => episode.title)).toEqual([
      'S1 A', 'S2 A', 'S2 B',
    ])
  })

  it('re-queries and succeeds on one failed season retry', async () => {
    const result = await discoverEpisodes(
      '30',
      createDropdownFixture({ seasonTwoMenuFailures: 1 }),
      new AbortController().signal,
    )
    expect(result.episodes).toHaveLength(3)
  })

  it('rejects atomically after a second failure without exposing partial data', async () => {
    const root = createDropdownFixture({ seasonTwoMenuFailures: 2 })
    await expect(discoverEpisodes('40', root, new AbortController().signal))
      .rejects.toMatchObject({ name: 'DiscoveryIncompleteError' })
  })

  it('propagates abort immediately without retrying', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(discoverEpisodes('50', createImplicitFixture(), controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' })
  })

  it('allows episode selector initialization after the former five-second limit', async () => {
    vi.useFakeTimers()
    const root = document.createElement('div')
    document.body.append(root)
    const operation = discoverEpisodes('60', root, new AbortController().signal)

    window.setTimeout(() => {
      const selector = document.createElement('div')
      selector.dataset.uia = 'episode-selector'
      appendRow(selector, 'Delayed', 1)
      root.append(selector)
    }, 6_000)
    await vi.advanceTimersByTimeAsync(6_000)
    await vi.runAllTimersAsync()

    await expect(operation).resolves.toMatchObject({
      id: '60', totalSeasons: 1, episodes: [{ title: 'Delayed' }],
    })
  })
})
