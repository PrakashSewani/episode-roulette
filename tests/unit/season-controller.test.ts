import { describe, expect, it } from 'vitest'

import { getValidEpisodeRows } from '../../src/netflix/season-controller'

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
