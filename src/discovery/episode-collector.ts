import type { Episode, SeasonDescriptor } from '../types'
import { parseEpisodeRowIdentity } from '../netflix/episode-identity'

export function collectEpisodes(
  seriesId: string,
  season: SeasonDescriptor,
  rows: HTMLElement[],
): Episode[] {
  return rows.map((row, episodeIndex) => {
    const identity = parseEpisodeRowIdentity(row, episodeIndex)

    return {
      seriesId,
      seasonKey: season.key,
      seasonLabel: season.label,
      seasonNumber: season.seasonNumber,
      episodeIndex,
      episodeNumber: identity.episodeNumber,
      title: identity.title,
      discoveredSeasonEpisodeCount: rows.length,
    }
  })
}
