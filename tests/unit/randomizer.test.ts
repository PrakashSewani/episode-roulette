import { describe, expect, it, vi } from 'vitest'

import { pickRandom } from '../../src/engine/randomizer'
import type { Episode } from '../../src/types'

function episode(index: number): Episode {
  return {
    seriesId: '1',
    seasonKey: 'season 1',
    seasonLabel: 'Season 1',
    seasonNumber: 1,
    episodeIndex: index,
    episodeNumber: index + 1,
    title: `Episode ${index + 1}`,
    discoveredSeasonEpisodeCount: 3,
  }
}

describe('pickRandom', () => {
  it('maps Math.random uniformly across array indexes', () => {
    const episodes = [episode(0), episode(1), episode(2)]

    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99)
    expect(pickRandom(episodes)).toBe(episodes[0])
    expect(pickRandom(episodes)).toBe(episodes[2])
  })

  it('throws on an empty array and returns a single item', () => {
    expect(() => pickRandom([])).toThrow('Cannot pick random episode from empty array')
    const only = episode(0)
    expect(pickRandom([only])).toBe(only)
  })

  it('allows independent repeated selections without history', () => {
    const episodes = [episode(0), episode(1)]
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    expect(pickRandom(episodes)).toBe(episodes[0])
    expect(pickRandom(episodes)).toBe(episodes[0])
  })
})
