import type { SelectorConfig } from '../types'

export const TITLE_DETAILS_ROOT: SelectorConfig = {
  name: 'Active Title Details Root',
  selectors: [
    '[data-uia="modal-motion-container-DETAIL_MODAL"][role="dialog"]',
    '[data-uia="title-details"]',
    '[data-testid="title-details"]',
    '[role="dialog"]',
  ],
}

export const EPISODE_SELECTOR: SelectorConfig = {
  name: 'Episode Selector',
  selectors: ['[data-uia="episode-selector"]'],
}

export const TITLE_DETAILS_METADATA: SelectorConfig = {
  name: 'Title Details Metadata',
  selectors: [
    '[data-uia="previewModal--detailsMetadata"]',
    '[data-uia="preview-modal-synopsis"]',
  ],
}

export const SEASON_DROPDOWN_TOGGLE: SelectorConfig = {
  name: 'Season Dropdown Toggle',
  selectors: ['[data-uia="dropdown-toggle"][aria-haspopup="true"]'],
}

export const SEASON_DROPDOWN_MENU: SelectorConfig = {
  name: 'Season Dropdown Menu',
  selectors: ['[data-uia="dropdown-menu"][role="menu"]'],
}

export const SEASON_DROPDOWN_ITEM: SelectorConfig = {
  name: 'Season Dropdown Item',
  selectors: ['[data-uia="dropdown-menu-item"][role="menuitem"]'],
}

export const PLAY_BUTTON: SelectorConfig = {
  name: 'Play Button',
  selectors: [
    '[data-uia="play-button"]',
    '[data-testid="play-button"]',
    'button[data-testid="episodic-play-all"]',
  ],
}

export const SECTION_EXPAND: SelectorConfig = {
  name: 'Expand Episode Section',
  selectors: ['[data-uia="section-expand"]'],
}

export const EPISODE_ROW: SelectorConfig = {
  name: 'Episode Row',
  selectors: ['[data-uia="titleCard--container"][role="button"]'],
}

export const EPISODE_TITLE: SelectorConfig = {
  name: 'Episode Title',
  selectors: [
    '[data-uia="episode-title"]',
    '[data-testid="episode-title"]',
    'h4[class*="episodeTitle"]',
  ],
}

export const EPISODE_NUMBER: SelectorConfig = {
  name: 'Episode Number',
  selectors: [
    '[data-uia="episode-number"]',
    '[data-testid="episode-number"]',
    '.titleCard-title_index',
  ],
}
