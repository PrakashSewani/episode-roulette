import { describe, expect, it } from 'vitest'

import {
  normalizeEpisodeTitle,
  parseEpisodeRowIdentity,
  resolveEpisodeRow,
} from '../../src/netflix/episode-identity'
import type { Episode } from '../../src/types'

function createRow({
  title,
  number,
  fallbackNumber,
}: {
  title?: string
  number?: string
  fallbackNumber?: string
} = {}): HTMLElement {
  const row = document.createElement('div')
  row.dataset.uia = 'titleCard--container'
  row.setAttribute('role', 'button')
  if (title !== undefined) row.setAttribute('aria-label', title)
  if (number !== undefined) {
    row.insertAdjacentHTML('beforeend', `<span data-uia="episode-number">${number}</span>`)
  }
  if (fallbackNumber !== undefined) {
    row.insertAdjacentHTML('beforeend', `<span class="titleCard-title_index">${fallbackNumber}</span>`)
  }
  return row
}

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    seriesId: '1',
    seasonKey: 'season 1',
    seasonLabel: 'Season 1',
    seasonNumber: 1,
    episodeIndex: 0,
    episodeNumber: 1,
    title: 'Pilot',
    discoveredSeasonEpisodeCount: 1,
    ...overrides,
  }
}

describe('episode identity', () => {
  it('normalizes Unicode whitespace and case while preserving punctuation', () => {
    expect(normalizeEpisodeTitle('  The\u00a0ONE: Pilot!  ')).toBe('the one: pilot!')
  })

  it('uses aria-label before title selectors and parses complete number formats', () => {
    const row = createRow({ title: 'ARIA Title', number: 'Ep. 12' })
    row.insertAdjacentHTML('beforeend', '<h4 data-uia="episode-title">Other</h4>')
    expect(parseEpisodeRowIdentity(row, 3)).toMatchObject({
      title: 'ARIA Title',
      normalizedTitle: 'aria title',
      episodeNumber: 12,
      episodeNumberConflict: false,
      episodeIndex: 3,
    })
  })

  it('ignores embedded numbers and reports conflicting number sources', () => {
    const embedded = createRow({ title: 'Chapter 12', number: 'Episode 2 recap' })
    expect(parseEpisodeRowIdentity(embedded, 0).episodeNumber).toBeNull()

    const conflict = createRow({ title: 'Pilot', number: 'E1', fallbackNumber: '2' })
    expect(parseEpisodeRowIdentity(conflict, 0)).toMatchObject({
      episodeNumber: null,
      episodeNumberConflict: true,
    })
  })

  it('resolves by unique number and title, then unique title', () => {
    const rows = [
      createRow({ title: 'Pilot', number: '1' }),
      createRow({ title: 'Second', number: '2' }),
    ]
    expect(resolveEpisodeRow(episode({ discoveredSeasonEpisodeCount: 2 }), rows)).toBe(rows[0])
    expect(resolveEpisodeRow(episode({ episodeNumber: null, title: 'Second', discoveredSeasonEpisodeCount: 2 }), rows)).toBe(rows[1])
  })

  it('fails on ambiguous titles and gates index fallback by complete count', () => {
    const rows = [createRow({ title: 'Same' }), createRow({ title: 'Same' })]
    expect(resolveEpisodeRow(episode({ episodeNumber: null, title: 'Same', discoveredSeasonEpisodeCount: 2 }), rows)).toBeNull()
    expect(resolveEpisodeRow(episode({ episodeNumber: null, title: 'Unknown Episode', episodeIndex: 1, discoveredSeasonEpisodeCount: 2 }), rows)).toBe(rows[1])
    expect(resolveEpisodeRow(episode({ episodeNumber: 9, title: 'Unknown Episode', episodeIndex: 1, discoveredSeasonEpisodeCount: 2 }), rows)).toBe(rows[1])
    expect(resolveEpisodeRow(episode({ episodeNumber: null, title: 'Unknown Episode', episodeIndex: 1, discoveredSeasonEpisodeCount: 3 }), rows)).toBeNull()
  })
})
