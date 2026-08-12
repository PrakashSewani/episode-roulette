import type { Episode } from '../types'

export const PENDING_PLAYBACK_KEY = 'episode-roulette:prime-pending-playback'
export const PENDING_DISCOVERY_KEY = 'episode-roulette:prime-pending-discovery'

export interface PendingPlayback {
  seriesId: string
  detailId: string
  episode: Episode
  expiresAt: number
}

export interface PendingDiscovery {
  seriesId: string
  seasons: Array<{ id: string; label: string }>
  index: number
  episodes: Episode[]
  expiresAt: number
}
