export interface SelectorConfig {
  name: string
  selectors: string[]
}

export type PageChangeEvent =
  | { type: 'route-changed'; url: string }
  | { type: 'title-dom-changed'; url: string; generation: number }
  | { type: 'title-root-removed'; url: string; generation: number }

export type PageChangeCallback = (event: PageChangeEvent) => void

export type ProviderId = 'netflix' | 'prime-video'

export type CatalogKey = `${ProviderId}:${string}`

export function getCatalogKey(provider: ProviderId, titleId: string): CatalogKey {
  return `${provider}:${titleId}`
}

export interface DetectionResult {
  status: 'unconfirmed' | 'series'
  titleId: string
  signals: string[]
}

export interface ButtonPlacement {
  readonly spawnRoot: HTMLElement
  place(button: HTMLButtonElement): void
}

export interface TitleContext {
  provider: ProviderId
  titleId: string
  source: 'jbv' | 'title-path' | 'prime-detail'
  url: string
}

export interface OperationContext {
  title: TitleContext
  generation: number
  controller: AbortController
  detectionDeadline: number
}

export interface Episode {
  provider: ProviderId
  seriesId: string
  seasonKey: string
  seasonLabel: string
  seasonNumber: number | null
  episodeIndex: number
  episodeNumber: number | null
  title: string
  normalizedTitle: string | null
  discoveredSeasonEpisodeCount: number
}

export interface SeriesInfo {
  provider: ProviderId
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
  getState(): ButtonState
  onClick(handler: () => void): void
  remove(): void
}

export interface ProviderRuntime {
  readonly id: ProviderId
  matches(url: string): boolean
  start(callback: PageChangeCallback): void
  stop(): void
  getTitleContext(url: string): TitleContext | null
  resolveTitleRoot(): HTMLElement | null
  detectSeries(context: TitleContext, root: HTMLElement): DetectionResult
  observeForTitleRoot(generation: number): void
  observeTitleRoot(root: HTMLElement, generation: number): void
  clearObservation(): void
  waitForButtonPlacement(root: HTMLElement, signal: AbortSignal): Promise<ButtonPlacement | null>
  discoverEpisodes(context: TitleContext, root: HTMLElement, signal: AbortSignal): Promise<SeriesInfo>
  playEpisode(episode: Episode, root: HTMLElement, signal: AbortSignal, assertCurrent: () => void): Promise<boolean>
  waitForPlaybackConfirmation(episode: Episode, signal: AbortSignal): Promise<void>
  restartPlayback(episode: Episode, signal: AbortSignal): Promise<void>
  isInternalNavigation(url: string): boolean
  getPendingPlayback(): Episode | null
  resumePendingPlayback(episode: Episode, root: HTMLElement, signal: AbortSignal, assertCurrent: () => void): Promise<boolean>
  hasPendingOperation(): boolean
  resetPendingOperations(): void
  notifyRouteChange(url: string): void
}

export type PopupStatus = 'no-series' | 'ready' | 'loading' | 'error'

export type PopupMessage =
  | { type: 'getStatus' }
  | { type: 'roll' }

export type PopupMessageResponse =
  | { type: 'status'; status: PopupStatus }
  | { type: 'roll-accepted' }
  | { type: 'roll-rejected'; reason: string }
