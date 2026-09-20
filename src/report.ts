import {
  CacheValidationMismatchError,
  DiscoveryIncompleteError,
  NoEpisodesError,
  PlaybackResolutionError,
  PlaybackTimeoutError,
  type ProviderId,
  type SeasonControllerFailureReason,
} from './types'

export const REPORT_BASE_URL = 'https://episode-roulette.prakashsewani.com/report'

export type ReportErrorCode =
  | 'discovery'
  | 'no-episodes'
  | 'playback-resolution'
  | 'playback-timeout'
  | 'unknown'

export interface ReportContext {
  provider: ProviderId
  titleId: string
  error: unknown
}

export interface ErrorClassification {
  code: ReportErrorCode
  reason: SeasonControllerFailureReason | null
  seasonLabel: string | null
}

export function classifyError(error: unknown): ErrorClassification {
  if (error instanceof DiscoveryIncompleteError) {
    return { code: 'discovery', reason: error.reason, seasonLabel: error.seasonLabel }
  }
  if (error instanceof NoEpisodesError) {
    return { code: 'no-episodes', reason: null, seasonLabel: null }
  }
  if (error instanceof PlaybackTimeoutError) {
    return { code: 'playback-timeout', reason: null, seasonLabel: null }
  }
  if (error instanceof PlaybackResolutionError || error instanceof CacheValidationMismatchError) {
    return { code: 'playback-resolution', reason: null, seasonLabel: null }
  }
  return { code: 'unknown', reason: null, seasonLabel: null }
}

export function getExtensionVersion(): string | null {
  try {
    const version: unknown = chrome.runtime.getManifest().version
    return typeof version === 'string' && version !== '' ? version : null
  } catch {
    return null
  }
}

export function buildReportUrl(context: ReportContext): string {
  const { code, reason, seasonLabel } = classifyError(context.error)
  const url = new URL(REPORT_BASE_URL)
  url.searchParams.set('code', code)
  url.searchParams.set('provider', context.provider)
  url.searchParams.set('titleId', context.titleId)

  if (reason !== null) {
    url.searchParams.set('reason', reason)
  }
  if (seasonLabel !== null && seasonLabel !== '') {
    url.searchParams.set('season', seasonLabel)
  }

  const version = getExtensionVersion()
  if (version !== null) {
    url.searchParams.set('v', version)
  }

  return url.toString()
}
