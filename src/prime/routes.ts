import type { TitleContext } from '../types'
import { PENDING_DISCOVERY_KEY, PENDING_PLAYBACK_KEY } from './pending'

export const PRIME_HOST = 'www.primevideo.com'

export function getPrimeDetailId(url: string): string | null {
  const parsed = new URL(url)
  if (parsed.hostname !== PRIME_HOST) return null
  const match = parsed.pathname.match(/^\/detail\/([^/?#]+)(?:\/|$)/u)
  return match?.[1] ?? null
}

export function getPrimeTitleContext(url: string): TitleContext | null {
  const detailId = getPrimeDetailId(url)
  if (detailId === null) return null
  let titleId = detailId
  try {
    for (const key of [PENDING_DISCOVERY_KEY, PENDING_PLAYBACK_KEY]) {
      const raw = window.sessionStorage.getItem(key)
      if (raw !== null) {
        const pending = JSON.parse(raw) as { seriesId?: string; expiresAt?: number }
        if (pending.seriesId !== undefined && (pending.expiresAt ?? 0) > Date.now()) {
          titleId = pending.seriesId
          break
        }
      }
    }
  } catch {
    window.sessionStorage.removeItem(PENDING_DISCOVERY_KEY)
    window.sessionStorage.removeItem(PENDING_PLAYBACK_KEY)
  }
  return { provider: 'prime-video', titleId, source: 'prime-detail', url }
}
