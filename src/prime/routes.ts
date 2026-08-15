import type { TitleContext } from '../types'
import { PENDING_DISCOVERY_KEY, PENDING_PLAYBACK_KEY } from './pending'

export const PRIME_HOST = 'www.primevideo.com'

export function getPrimeDetailId(url: string): string | null {
  const parsed = new URL(url)
  if (parsed.hostname !== PRIME_HOST) return null
  const match = parsed.pathname.match(/^\/detail\/([^/?#]+)(?:\/|$)/u)
  return match?.[1] ?? null
}

function readPendingSeriesId(): string | null {
  for (const key of [PENDING_DISCOVERY_KEY, PENDING_PLAYBACK_KEY]) {
    try {
      const raw = window.sessionStorage.getItem(key)
      if (raw === null) continue
      const pending = JSON.parse(raw) as { seriesId?: string; expiresAt?: number }
      if (pending.seriesId !== undefined && (pending.expiresAt ?? 0) > Date.now()) {
        return pending.seriesId
      }
    } catch {
      // A corrupt marker must not wipe both markers; drop only the bad one.
      window.sessionStorage.removeItem(key)
    }
  }
  return null
}

export function getPrimeTitleContext(url: string): TitleContext | null {
  const detailId = getPrimeDetailId(url)
  // A pending marker keeps the series identity stable across season
  // navigation, including transient non-detail routes during the flow.
  const seriesId = readPendingSeriesId()
  if (detailId === null && seriesId === null) return null
  return {
    provider: 'prime-video',
    titleId: seriesId ?? detailId ?? '',
    source: 'prime-detail',
    url,
  }
}
