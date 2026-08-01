/**
 * Development diagnostics. Remove or silence before shipping
 * (tracked in docs/project-todos.md).
 */

const PREFIX = '[Episode Roulette]'

export function logInfo(message: string, details?: unknown): void {
  if (details === undefined) {
    console.log(`${PREFIX} ${message}`)
    return
  }
  console.log(`${PREFIX} ${message}`, details)
}

export function logWarning(message: string, details?: unknown): void {
  if (details === undefined) {
    console.warn(`${PREFIX} ${message}`)
    return
  }
  console.warn(`${PREFIX} ${message}`, details)
}

export function logError(message: string, details?: unknown): void {
  if (details === undefined) {
    console.error(`${PREFIX} ${message}`)
    return
  }
  console.error(`${PREFIX} ${message}`, details)
}
