import { describe, expect, it } from 'vitest'

import { collectEpisodes } from '../../src/discovery/episode-collector'
import type { SeasonDescriptor } from '../../src/types'

describe('episode collector', () => {
  it('creates durable metadata with complete indexes and row counts', () => {
    const season: SeasonDescriptor = {
      key: 'season 2',
      label: 'Season 2',
      seasonNumber: 2,
      expectedEpisodeCount: 2,
    }
    const first = document.createElement('div')
    first.setAttribute('aria-label', 'First')
    first.innerHTML = '<span data-uia="episode-number">E1</span>'
    const second = document.createElement('div')

    const result = collectEpisodes('99', season, [first, second])

    expect(result).toEqual([
      {
        seriesId: '99', seasonKey: 'season 2', seasonLabel: 'Season 2',
        seasonNumber: 2, episodeIndex: 0, episodeNumber: 1, title: 'First',
        discoveredSeasonEpisodeCount: 2,
      },
      {
        seriesId: '99', seasonKey: 'season 2', seasonLabel: 'Season 2',
        seasonNumber: 2, episodeIndex: 1, episodeNumber: null,
        title: 'Unknown Episode', discoveredSeasonEpisodeCount: 2,
      },
    ])
    expect(JSON.stringify(result)).not.toContain('HTMLElement')
    expect(result.every((item) => !('element' in item) && !('url' in item))).toBe(true)
  })
})
