import { afterEach, describe, expect, it } from 'vitest'

import netflixRuntime from '../../src/providers/netflix'
import primeRuntime from '../../src/providers/prime-video'
import { getProvider, getProviders } from '../../src/providers'
import { getCatalogKey } from '../../src/types'
import type { Episode } from '../../src/types'

function episode(): Episode {
  return {
    provider: 'netflix',
    seriesId: '123',
    seasonKey: 'implicit',
    seasonLabel: 'Episodes',
    seasonNumber: null,
    episodeIndex: 0,
    episodeNumber: 1,
    title: 'Pilot',
    normalizedTitle: 'pilot',
    discoveredSeasonEpisodeCount: 1,
  }
}

describe('provider runtime registry', () => {
  afterEach(() => {
    netflixRuntime.stop()
    primeRuntime.stop()
  })

  it('dispatches only supported exact hosts', () => {
    expect(getProvider('https://www.netflix.com/title/123')?.id).toBe('netflix')
    expect(getProvider('https://netflix.com/title/123')?.id).toBe('netflix')
    expect(getProvider('https://www.primevideo.com/detail/abc')?.id).toBe('prime-video')
    expect(getProvider('https://www.amazon.com/title/123')).toBeNull()
    expect(getProviders().map((provider) => provider.id)).toEqual(['netflix', 'prime-video'])
  })

  it('keeps equal provider-local IDs in separate cache namespaces', () => {
    expect(getCatalogKey('netflix', '123')).toBe('netflix:123')
    expect(getCatalogKey('prime-video', '123')).toBe('prime-video:123')
    expect(getCatalogKey('netflix', '123')).not.toBe(getCatalogKey('prime-video', '123'))
  })

  it('qualifies Netflix title identity at the provider boundary', () => {
    expect(netflixRuntime.getTitleContext('https://www.netflix.com/title/123')).toEqual({
      provider: 'netflix',
      titleId: '123',
      source: 'title-path',
      url: 'https://www.netflix.com/title/123',
    })
  })

  it('delegates scoped series detection and button placement', async () => {
    const root = document.createElement('div')
    root.dataset.uia = 'modal-motion-container-DETAIL_MODAL'
    root.setAttribute('role', 'dialog')
    const playContainer = document.createElement('div')
    const playButton = document.createElement('button')
    playButton.dataset.uia = 'play-button'
    playContainer.append(playButton)
    const episodeSelector = document.createElement('div')
    episodeSelector.dataset.uia = 'episode-selector'
    const episodeRow = document.createElement('div')
    episodeRow.dataset.uia = 'titleCard--container'
    episodeRow.setAttribute('role', 'button')
    episodeSelector.append(episodeRow)
    root.append(playContainer, episodeSelector)
    document.body.append(root)

    const context = netflixRuntime.getTitleContext('https://www.netflix.com/title/123')!
    expect(netflixRuntime.detectSeries(context, root).status).toBe('series')

    const placement = await netflixRuntime.waitForButtonPlacement(
      root,
      new AbortController().signal,
    )
    const button = document.createElement('button')
    placement?.place(button)
    expect(playButton.nextElementSibling).toBe(button)
  })

  it('confirms Netflix playback from the provider route signal', async () => {
    const pending = netflixRuntime.waitForPlaybackConfirmation(
      episode(),
      new AbortController().signal,
    )
    netflixRuntime.notifyRouteChange('https://www.netflix.com/watch/123')
    await expect(pending).resolves.toBeUndefined()
  })

  it('cancels provider playback confirmation through AbortSignal', async () => {
    const controller = new AbortController()
    const pending = netflixRuntime.waitForPlaybackConfirmation(episode(), controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
