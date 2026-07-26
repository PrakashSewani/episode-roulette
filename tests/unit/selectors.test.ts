import { describe, expect, it } from 'vitest'

import {
  EPISODE_ROW,
  EPISODE_SELECTOR,
  PLAYER_TIMELINE,
  PLAY_BUTTON,
  TITLE_DETAILS_ROOT,
  VIDEO_PLAYER,
} from '../../src/netflix/selectors'

describe('Netflix selectors', () => {
  it('keeps the documented Phase 2 selector contracts centralized', () => {
    expect(TITLE_DETAILS_ROOT.selectors).toEqual([
      '[data-uia="modal-motion-container-DETAIL_MODAL"][role="dialog"]',
      '[data-uia="title-details"]',
      '[data-testid="title-details"]',
      '[role="dialog"]',
    ])
    expect(EPISODE_SELECTOR.selectors).toEqual(['[data-uia="episode-selector"]'])
    expect(EPISODE_ROW.selectors).toEqual([
      '[data-uia="titleCard--container"][role="button"]',
    ])
    expect(PLAY_BUTTON.selectors).toContain('[data-uia="play-button"]')
    expect(VIDEO_PLAYER.selectors).toEqual(['video'])
    expect(PLAYER_TIMELINE.selectors[0]).toBe('[data-uia="timeline"]')
  })
})
