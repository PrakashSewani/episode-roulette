import { describe, expect, it } from 'vitest'

import { injectStyles, removeStyles } from '../../src/ui/styles'

describe('UI styles', () => {
  it('injects one isolated style element and removes it idempotently', () => {
    injectStyles()
    injectStyles()

    const styles = document.querySelectorAll('#ep-roulette-styles')
    expect(styles).toHaveLength(1)
    expect(styles[0]?.textContent).toContain('.ep-roulette-btn[data-state="loading"]')
    expect(styles[0]?.textContent).toContain('.ep-roulette-toast')

    removeStyles()
    removeStyles()
    expect(document.getElementById('ep-roulette-styles')).toBeNull()
  })
})
