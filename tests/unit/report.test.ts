import { describe, expect, it } from 'vitest'

import {
  buildReportUrl,
  classifyError,
  getExtensionVersion,
  REPORT_BASE_URL,
} from '../../src/report'
import {
  CacheValidationMismatchError,
  DiscoveryIncompleteError,
  NoEpisodesError,
  PlaybackResolutionError,
  PlaybackTimeoutError,
} from '../../src/types'

function params(url: string): URLSearchParams {
  return new URL(url).searchParams
}

function withoutChrome<T>(run: () => T): T {
  const original = globalThis.chrome
  delete (globalThis as { chrome?: unknown }).chrome
  try {
    return run()
  } finally {
    globalThis.chrome = original
  }
}

describe('classifyError', () => {
  it('carries the structured detail of a discovery failure', () => {
    const error = new DiscoveryIncompleteError('Could not collect Season 4', {
      seasonLabel: 'Season 4',
      reason: 'render-timeout',
    })

    expect(classifyError(error)).toEqual({
      code: 'discovery',
      reason: 'render-timeout',
      seasonLabel: 'Season 4',
    })
  })

  it('reports a discovery failure without detail as bare discovery', () => {
    expect(classifyError(new DiscoveryIncompleteError('Episode selector did not render'))).toEqual({
      code: 'discovery',
      reason: null,
      seasonLabel: null,
    })
  })

  it('maps no-episodes, playback resolution, and the cache mismatch', () => {
    expect(classifyError(new NoEpisodesError('No episodes found')).code).toBe('no-episodes')
    expect(classifyError(new PlaybackResolutionError('Episode selector could not be resolved'))
      .code).toBe('playback-resolution')
    expect(classifyError(new CacheValidationMismatchError('Season 2 changed')).code)
      .toBe('playback-resolution')
  })

  it('maps the playback timeout before its base class', () => {
    const error = new PlaybackTimeoutError('Playback did not start')
    expect(error).toBeInstanceOf(PlaybackResolutionError)
    expect(classifyError(error)).toEqual({
      code: 'playback-timeout',
      reason: null,
      seasonLabel: null,
    })
  })

  it('maps anything unexpected to unknown without throwing', () => {
    for (const value of ['boom', null, undefined, 42, { message: 'nope' }, new Error('plain')]) {
      expect(classifyError(value)).toEqual({ code: 'unknown', reason: null, seasonLabel: null })
    }
  })
})

describe('getExtensionVersion', () => {
  it('reads the running manifest version', () => {
    expect(getExtensionVersion()).toBe('0.0.0-test')
  })

  it('returns null when the runtime is missing or throwing', () => {
    expect(withoutChrome(() => getExtensionVersion())).toBeNull()

    const original = globalThis.chrome
    globalThis.chrome = {
      runtime: {
        getManifest: () => {
          throw new Error('no manifest')
        },
      },
    } as unknown as typeof chrome
    try {
      expect(getExtensionVersion()).toBeNull()
    } finally {
      globalThis.chrome = original
    }
  })
})

describe('buildReportUrl', () => {
  it('always carries the code, provider, and title identity', () => {
    const url = buildReportUrl({
      provider: 'netflix',
      titleId: '81234567',
      error: new NoEpisodesError('No episodes found'),
    })

    expect(url.startsWith(REPORT_BASE_URL)).toBe(true)
    const search = params(url)
    expect(search.get('code')).toBe('no-episodes')
    expect(search.get('provider')).toBe('netflix')
    expect(search.get('titleId')).toBe('81234567')
    expect(search.get('v')).toBe('0.0.0-test')
  })

  it('carries the reason and failed season and encodes a named season', () => {
    const url = buildReportUrl({
      provider: 'netflix',
      titleId: '80179831',
      error: new DiscoveryIncompleteError('Could not collect Phantom Blood/Battle Tendency', {
        seasonLabel: 'Phantom Blood/Battle Tendency',
        reason: 'count-mismatch',
      }),
    })

    expect(url).toContain('Phantom+Blood%2FBattle+Tendency')
    const search = params(url)
    expect(search.get('code')).toBe('discovery')
    expect(search.get('reason')).toBe('count-mismatch')
    expect(search.get('season')).toBe('Phantom Blood/Battle Tendency')
  })

  it('omits reason, season, and version when they are unknown', () => {
    const url = withoutChrome(() => buildReportUrl({
      provider: 'prime-video',
      titleId: 'amzn1.dv.gti.abc',
      error: new PlaybackTimeoutError('Playback did not start'),
    }))

    const search = params(url)
    expect(search.get('code')).toBe('playback-timeout')
    expect(search.get('provider')).toBe('prime-video')
    expect(search.get('titleId')).toBe('amzn1.dv.gti.abc')
    expect(search.has('reason')).toBe(false)
    expect(search.has('season')).toBe(false)
    expect(search.has('v')).toBe(false)
  })

  it('never throws for an unrecognized error value', () => {
    const url = buildReportUrl({ provider: 'netflix', titleId: '1', error: undefined })
    expect(params(url).get('code')).toBe('unknown')
  })
})
