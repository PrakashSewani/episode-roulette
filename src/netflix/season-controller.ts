import { EPISODE_ROW } from './selectors'

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  const hasLayoutBox = [...element.getClientRects()].some(
    (rect) => rect.width > 0 && rect.height > 0,
  )

  return hasLayoutBox
    && style.display !== 'none'
    && style.visibility !== 'hidden'
}

export function getValidEpisodeRows(episodeSelector: ParentNode): HTMLElement[] {
  const candidates = new Set<HTMLElement>()

  for (const selector of EPISODE_ROW.selectors) {
    for (const match of episodeSelector.querySelectorAll<HTMLElement>(selector)) {
      candidates.add(match)
    }
  }

  return [...candidates].filter((row) => (
    row.isConnected
    && row.getAttribute('role') === 'button'
    && isVisible(row)
  ))
}
