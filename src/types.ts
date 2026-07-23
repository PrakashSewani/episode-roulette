export interface SelectorConfig {
  name: string
  selectors: string[]
}

export type PageChangeEvent =
  | { type: 'route-changed'; url: string }
  | { type: 'title-dom-changed'; url: string; generation: number }
  | { type: 'title-root-removed'; url: string; generation: number }

export type PageChangeCallback = (event: PageChangeEvent) => void

export interface TitleContext {
  titleId: string
  source: 'jbv' | 'title-path'
  url: string
}

export interface OperationContext {
  title: TitleContext
  generation: number
  controller: AbortController
  detectionDeadline: number
}

export interface Episode {
  seriesId: string
  seasonKey: string
  seasonLabel: string
  seasonNumber: number | null
  episodeIndex: number
  episodeNumber: number | null
  title: string
  discoveredSeasonEpisodeCount: number
}

export interface SeriesInfo {
  id: string
  totalSeasons: number
  episodes: Episode[]
  discoveredAt: number
}

export interface SeasonDescriptor {
  key: string
  label: string
  seasonNumber: number | null
  expectedEpisodeCount: number | null
}

export interface EpisodeRowIdentity {
  title: string
  normalizedTitle: string | null
  episodeNumber: number | null
  episodeNumberConflict: boolean
  episodeIndex: number
}

export type SeasonControllerFailureReason =
  | 'unsupported-layout'
  | 'season-missing'
  | 'strategy-mismatch'
  | 'active-season-mismatch'
  | 'count-mismatch'
  | 'render-timeout'
  | 'transition-timeout'
  | 'expansion-failed'

export class SeasonControllerError extends Error {
  readonly name = 'SeasonControllerError'

  constructor(
    readonly reason: SeasonControllerFailureReason,
    message: string,
  ) {
    super(message)
  }
}

export class CacheValidationMismatchError extends Error {
  readonly name = 'CacheValidationMismatchError'
}

export class PlaybackResolutionError extends Error {
  readonly name = 'PlaybackResolutionError'
}

export class DiscoveryIncompleteError extends Error {
  readonly name = 'DiscoveryIncompleteError'
}

export class NoEpisodesError extends Error {
  readonly name = 'NoEpisodesError'
}

export type ButtonState = 'loading' | 'ready' | 'error'

export interface ButtonController {
  setState(state: ButtonState, errorMessage?: string): void
  onClick(handler: () => void): void
  remove(): void
}
