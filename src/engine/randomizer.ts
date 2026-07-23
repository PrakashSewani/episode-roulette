import type { Episode } from '../types'

export function pickRandom(episodes: Episode[]): Episode {
  if (episodes.length === 0) {
    throw new Error('Cannot pick random episode from empty array')
  }

  return episodes[Math.floor(Math.random() * episodes.length)]!
}
