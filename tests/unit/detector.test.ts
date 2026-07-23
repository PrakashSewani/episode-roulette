import { describe, expect, it } from 'vitest'

import { detectSeries, getTitleContext } from '../../src/netflix/detector'
import { createTitleDetails } from '../fixtures/title-details'

describe('getTitleContext', () => {
  it('extracts numeric title paths', () => {
    expect(getTitleContext('https://www.netflix.com/title/80057281')).toEqual({
      titleId: '80057281',
      source: 'title-path',
      url: 'https://www.netflix.com/title/80057281',
    })
  })

  it('gives numeric jbv identity precedence over the title path', () => {
    expect(getTitleContext('https://www.netflix.com/title/1?jbv=2')?.titleId).toBe('2')
    expect(getTitleContext('https://www.netflix.com/title/1?jbv=2')?.source).toBe('jbv')
  })

  it('falls back to a title path when jbv is non-numeric', () => {
    expect(getTitleContext('https://www.netflix.com/title/3?jbv=movie')?.titleId).toBe('3')
  })

  it('rejects browse and watch routes without an active title context', () => {
    expect(getTitleContext('https://www.netflix.com/browse')).toBeNull()
    expect(getTitleContext('https://www.netflix.com/watch/123?jbv=456')).toBeNull()
  })
})

describe('detectSeries', () => {
  it('confirms valid episode rows without requiring a season control', () => {
    const root = createTitleDetails({ episodic: true })
    document.body.append(root)
    const context = getTitleContext('https://www.netflix.com/title/80057281')!

    expect(detectSeries(context, root)).toEqual({
      status: 'series',
      titleId: '80057281',
      signals: ['valid-episode-rows'],
    })
  })

  it('ignores episode rows outside the supplied root', () => {
    const episodicRoot = createTitleDetails({ episodic: true })
    const movieRoot = createTitleDetails()
    document.body.append(episodicRoot, movieRoot)
    const context = getTitleContext('https://www.netflix.com/title/80057281')!

    expect(detectSeries(context, movieRoot).status).toBe('unconfirmed')
  })
})
