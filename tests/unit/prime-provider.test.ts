import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPrimeDetail, createPrimePlayer } from '../fixtures/prime-video'
import primeRuntime from '../../src/providers/prime-video'
import { getPrimeDetailId, getPrimeTitleContext } from '../../src/prime/routes'
import { isPrimeRowEligible, parsePrimeEpisodeIdentity } from '../../src/prime/identity'
import type { Episode } from '../../src/types'

function episode(seasonKey = 'detail:season-4'): Episode {
  return {
    provider: 'prime-video',
    seriesId: 'season-4',
    seasonKey,
    seasonLabel: 'Season 4',
    seasonNumber: 4,
    episodeIndex: 0,
    episodeNumber: 1,
    title: 'Episode 1',
    normalizedTitle: 'episode 1',
    discoveredSeasonEpisodeCount: 3,
  }
}

describe('Prime provider', () => {
  afterEach(() => {
    primeRuntime.stop()
    window.history.replaceState({}, '', '/browse')
    window.sessionStorage.clear()
    document.body.innerHTML = ''
  })

  it('recognizes only exact Prime detail routes', () => {
    expect(getPrimeDetailId('https://www.primevideo.com/detail/opaque')).toBe('opaque')
    expect(getPrimeTitleContext('https://www.primevideo.com/detail/opaque?ref=season')).toEqual({
      provider: 'prime-video',
      titleId: 'opaque',
      source: 'prime-detail',
      url: 'https://www.primevideo.com/detail/opaque?ref=season',
    })
    expect(getPrimeTitleContext('https://primevideo.com/detail/opaque')).toBeNull()
    expect(getPrimeTitleContext('https://www.primevideo.com/home')).toBeNull()
  })

  it('excludes rows without native play controls', () => {
    const root = createPrimeDetail({ playableCount: 3, includeSeasonLinks: false })
    const rows = [...root.querySelectorAll<HTMLElement>('[data-testid="episode-list-item"]')]
    expect(rows.filter(isPrimeRowEligible)).toHaveLength(3)
    expect(parsePrimeEpisodeIdentity(rows[0]!, 0)).toMatchObject({
      episodeNumber: 1,
      title: 'Episode 1',
      normalizedTitle: 'episode 1',
    })
    expect(parsePrimeEpisodeIdentity(rows[3]!, 3)).toBeNull()
  })

  it('detects Prime series and places after the main play action', async () => {
    const root = createPrimeDetail()
    document.body.append(root)
    const context = getPrimeTitleContext('https://www.primevideo.com/detail/season-4')!
    expect(primeRuntime.detectSeries(context, root).status).toBe('series')
    const placement = await primeRuntime.waitForButtonPlacement(root, new AbortController().signal)
    const button = document.createElement('button')
    placement?.place(button)
    expect(root.querySelector('[data-testid="dp-atf-play-button"]')?.nextElementSibling).toBe(button)
  })

  it('discovers a complete eligible catalog atomically', async () => {
    const root = createPrimeDetail({ playableCount: 3, includeSeasonLinks: false })
    document.body.append(root)
    const context = getPrimeTitleContext('https://www.primevideo.com/detail/season-4')!
    const catalog = await primeRuntime.discoverEpisodes(context, root, new AbortController().signal)
    expect(catalog.provider).toBe('prime-video')
    expect(catalog.episodes).toHaveLength(3)
    expect(catalog.episodes.every((item) => item.provider === 'prime-video')).toBe(true)
    expect(catalog.episodes.every((item) => !('element' in item))).toBe(true)
  })

  it('clicks only the uniquely resolved native episode action', async () => {
    const root = createPrimeDetail({ playableCount: 3 })
    document.body.append(root)
    const action = root.querySelector<HTMLElement>('[data-testid="episodes-playbutton"]')!
    const click = vi.spyOn(action, 'click')
    await primeRuntime.playEpisode(episode('detail:season-4'), root, new AbortController().signal, () => {})
    expect(click).toHaveBeenCalledOnce()
  })

  it('confirms player metadata only after loading completes', async () => {
    const pending = primeRuntime.waitForPlaybackConfirmation(episode(), new AbortController().signal)
    document.body.append(createPrimePlayer('S4 E1 Episode 1', true))
    await Promise.resolve()
    let settled = false
    void pending.then(() => { settled = true })
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    expect(settled).toBe(false)
    document.querySelector('.atvwebplayersdk-loading-overlay')?.remove()
    await vi.waitFor(() => expect(settled).toBe(true))
  })

  it('persists a pending playback marker across provider reload boundaries', async () => {
    const root = createPrimeDetail({ playableCount: 3, includeSeasonLinks: false })
    document.body.append(root)
    const action = root.querySelector<HTMLElement>('[data-testid="episodes-playbutton"]')!
    await primeRuntime.playEpisode(episode('detail:season-4'), root, new AbortController().signal, () => {})
    expect(primeRuntime.getPendingPlayback()?.title).toBe('Episode 1')
    action.remove()
  })

  it('cancels player confirmation on abort', async () => {
    const controller = new AbortController()
    const pending = primeRuntime.waitForPlaybackConfirmation(episode(), controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
