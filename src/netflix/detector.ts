import type { TitleContext } from '../types'
import { EPISODE_SELECTOR } from './selectors'
import { getValidEpisodeRows } from './season-controller'

export interface DetectionResult {
  status: 'unconfirmed' | 'series'
  titleId: string
  signals: string[]
}

export function getTitleContext(url: string): TitleContext | null {
  const parsedUrl = new URL(url)

  if (parsedUrl.pathname.startsWith('/watch/')) {
    return null
  }

  const jbv = parsedUrl.searchParams.get('jbv')
  if (jbv !== null && /^\d+$/.test(jbv)) {
    return { titleId: jbv, source: 'jbv', url }
  }

  const titlePathMatch = parsedUrl.pathname.match(/^\/title\/(\d+)(?:\/|$)/)
  if (titlePathMatch?.[1] !== undefined) {
    return { titleId: titlePathMatch[1], source: 'title-path', url }
  }

  return null
}

export function detectSeries(
  context: TitleContext,
  root: ParentNode,
): DetectionResult {
  for (const selector of EPISODE_SELECTOR.selectors) {
    for (const episodeSelector of root.querySelectorAll(selector)) {
      if (getValidEpisodeRows(episodeSelector).length > 0) {
        return {
          status: 'series',
          titleId: context.titleId,
          signals: ['valid-episode-rows'],
        }
      }
    }
  }

  return {
    status: 'unconfirmed',
    titleId: context.titleId,
    signals: [],
  }
}
